import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// HeyGen API integration. Requires HEYGEN_API_KEY in env.
// POST: create a video from a selfie image (URL or data URL) and transcript
// GET: poll status by id

type CreateBody = { image: string; script: string; voiceId?: string }

const HEYGEN_BASE = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com'

async function parseResponseSafe(res: Response) {
    const text = await res.text().catch(() => '')
    try {
        return { asJson: JSON.parse(text), asText: text }
    } catch {
        return { asJson: null, asText: text }
    }
}

export async function POST(req: NextRequest) {
    try {
        const { image, script, voiceId }: CreateBody = await req.json()
        if (!image || !script) return NextResponse.json({ error: 'Missing image or script' }, { status: 400 })
        const key = process.env.HEYGEN_API_KEY
        if (!key) return NextResponse.json({ error: 'Server missing HEYGEN_API_KEY' }, { status: 500 })

        // Acquire image bytes and content-type for HeyGen Upload Asset
        let bytes: Buffer
        let contentType: string
        if (image.startsWith('data:')) {
            const match = image.match(/^data:(.*?);base64,(.*)$/)
            if (!match) return NextResponse.json({ error: 'Invalid data URL' }, { status: 400 })
            contentType = match[1]
            bytes = Buffer.from(match[2], 'base64')
        } else if (/^https?:\/\//i.test(image)) {
            const imgRes = await fetch(image)
            if (!imgRes.ok) {
                const parsed = await parseResponseSafe(imgRes)
                return NextResponse.json({ error: 'Failed to fetch selfie URL', details: { statusCode: imgRes.status, bodyText: parsed.asText } }, { status: 400 })
            }
            const arrBuf = await imgRes.arrayBuffer()
            bytes = Buffer.from(arrBuf)
            contentType = imgRes.headers.get('content-type') || 'image/jpeg'
        } else {
            return NextResponse.json({ error: 'Unsupported image format. Provide a data URL or https URL.' }, { status: 400 })
        }

        // Upload to HeyGen Asset API to obtain image_key
        const uploadUrl = 'https://upload.heygen.com/v1/asset'
        const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
        const upRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'X-Api-Key': key, 'Content-Type': contentType },
            body: ab,
        })
        const upParsed = await parseResponseSafe(upRes)
        const upJson = upParsed.asJson || {}
        if (!upRes.ok) {
            return NextResponse.json({ error: 'HeyGen asset upload failed', details: { statusCode: upRes.status, bodyJson: upJson, bodyText: upParsed.asText } }, { status: 502 })
        }
        const image_key = upJson?.image_key || upJson?.data?.image_key
        if (!image_key) {
            return NextResponse.json({ error: 'HeyGen upload succeeded but no image_key returned', details: upJson }, { status: 502 })
        }

        // Call AV4 generate (from photo) with script + voice
        const text = String(script).slice(0, 1500)
        const voice = voiceId || process.env.HEYGEN_VOICE_ID
        if (!voice) {
            return NextResponse.json({ error: 'Missing voice_id. Provide voiceId in request or set HEYGEN_VOICE_ID.' }, { status: 400 })
        }
        const video_title = `Endorser - ${text.substring(0, 32)}${text.length > 32 ? '…' : ''}`
        const av4Payload = { image_key, video_title, script: text, voice_id: voice, gender: "male", video_orientation: 'portrait' }
        const av4Url = `${HEYGEN_BASE}/v2/video/av4/generate`
        const genRes = await fetch(av4Url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': key },
            body: JSON.stringify(av4Payload),
        })
        const genParsed = await parseResponseSafe(genRes)
        const genJson = genParsed.asJson || {}
        if (genRes.ok) {
            const id = genJson?.data?.video_id || genJson?.video_id || genJson?.id
            if (!id) return NextResponse.json({ error: 'No video id returned', details: genJson, attempt: 'av4' }, { status: 502 })
            return NextResponse.json({ id, attempt: 'av4' })
        }
        // If AV4 requires higher plan, fallback to stock avatar on /v2/video/generate
        if (genRes.status === 403 && (genJson?.code === 400599 || /requires API Pro plan/i.test(genParsed.asText))) {
            // Fallback: prefer auto-picking a public avatar if HEYGEN_STOCK_AVATAR_ID is not provided
            let avatarId = process.env.HEYGEN_STOCK_AVATAR_ID || ''
            // Helper to call v2/generate with given avatar id
            const tryGenerate = async (aid: string) => {
                const v2Payload = {
                    video_inputs: [
                        {
                            character: { type: 'avatar', avatar_id: aid, avatar_style: 'normal' },
                            voice: { type: 'text', input_text: text, voice_id: voice },
                        },
                    ],
                    dimension: { width: 1280, height: 720 },
                    caption: false,
                    title: video_title,
                }
                const v2Url = `${HEYGEN_BASE}/v2/video/generate`
                const v2Res = await fetch(v2Url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Api-Key': key },
                    body: JSON.stringify(v2Payload),
                })
                const v2Parsed = await parseResponseSafe(v2Res)
                const v2Json = v2Parsed.asJson || {}
                return { v2Res, v2Parsed, v2Json }
            }
            let v2Res: Response, v2Parsed: any, v2Json: any
            // If no explicit avatar configured, list and pick a public one up front
            if (!avatarId) {
                const listRes = await fetch(`${HEYGEN_BASE}/v2/avatars`, { headers: { 'Accept': 'application/json', 'X-Api-Key': key } })
                const listParsed = await parseResponseSafe(listRes)
                const listJson = listParsed.asJson || {}
                if (listRes.ok && Array.isArray(listJson?.data)) {
                    const firstPublic = listJson.data.find((a: any) => a?.is_public || /_public$/.test(a?.avatar_id || ''))
                    if (firstPublic?.avatar_id) {
                        avatarId = firstPublic.avatar_id
                    }
                }
                // If still empty, fall back to a commonly available public id
                if (!avatarId) avatarId = 'Lina_Dress_Sitting_Side_public'
                const first = await tryGenerate(avatarId)
                v2Res = first.v2Res; v2Parsed = first.v2Parsed; v2Json = first.v2Json
            } else {
                // Use provided avatar first
                const first = await tryGenerate(avatarId)
                v2Res = first.v2Res; v2Parsed = first.v2Parsed; v2Json = first.v2Json
                // If not permitted, try to auto-pick a public one
                if (!v2Res.ok && /AVATAR_USAGE_NOT_PERMITTED|not permitted/i.test(v2Parsed.asText)) {
                    const listRes = await fetch(`${HEYGEN_BASE}/v2/avatars`, { headers: { 'Accept': 'application/json', 'X-Api-Key': key } })
                    const listParsed = await parseResponseSafe(listRes)
                    const listJson = listParsed.asJson || {}
                    if (listRes.ok && Array.isArray(listJson?.data)) {
                        const firstPublic = listJson.data.find((a: any) => a?.is_public || /_public$/.test(a?.avatar_id || ''))
                        if (firstPublic?.avatar_id) {
                            avatarId = firstPublic.avatar_id
                            const retry = await tryGenerate(avatarId)
                            v2Res = retry.v2Res; v2Parsed = retry.v2Parsed; v2Json = retry.v2Json
                        }
                    }
                }
            }
            if (!v2Res.ok) {
                return NextResponse.json({ error: 'HeyGen create failed', details: { statusCode: genRes.status, genBodyJson: genJson, genBodyText: genParsed.asText, fallbackStatus: v2Res.status, fallbackBody: v2Parsed.asText } }, { status: 502 })
            }
            if (v2Res.ok) {
                const id = v2Json?.data?.video_id || v2Json?.video_id || v2Json?.id
                if (!id) return NextResponse.json({ error: 'No video id returned', details: v2Json, attempt: 'v2-stock-avatar', avatarId }, { status: 502 })
                return NextResponse.json({ id, attempt: 'v2-stock-avatar', avatarId })
            }
            // Merge details for clarity
            return NextResponse.json({ error: 'HeyGen create failed', details: { statusCode: genRes.status, genBodyJson: genJson, genBodyText: genParsed.asText, fallbackStatus: v2Res.status, fallbackBody: v2Parsed.asText } }, { status: 502 })
        }

        // Generic error
        return NextResponse.json({ error: 'HeyGen create failed', details: { statusCode: genRes.status, genBodyJson: genParsed.asJson, genBodyText: genParsed.asText } }, { status: 502 })
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to create HeyGen video', details: e?.message ?? String(e) }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    try {
        const key = process.env.HEYGEN_API_KEY
        if (!key) return NextResponse.json({ error: 'Server missing HEYGEN_API_KEY' }, { status: 500 })
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

        // Try v2 status first
        const attempts = [
            { url: `${HEYGEN_BASE}/v2/video/status?video_id=${encodeURIComponent(id)}`, note: 'v2/status query' },
            { url: `${HEYGEN_BASE}/v2/video/status/${encodeURIComponent(id)}`, note: 'v2/status path' },
            { url: `${HEYGEN_BASE}/v1/video/status?video_id=${encodeURIComponent(id)}`, note: 'v1/status query' },
            { url: `${HEYGEN_BASE}/v1/video_status.get?video_id=${encodeURIComponent(id)}`, note: 'v1/video_status.get' },
        ]

        let lastDetail: any = null
        for (const attempt of attempts) {
            const r = await fetch(attempt.url, { headers: { 'x-api-key': key } })
            const parsed = await parseResponseSafe(r)
            const data = parsed.asJson || {}
            if (r.ok) {
                const status = data?.data?.status || data?.status
                const url = data?.data?.video_url || data?.video_url || data?.url
                const errObj = data?.data?.error || data?.error
                const message = errObj?.message || data?.message
                const code = errObj?.code || data?.code
                const payload: any = { status, url, attempt: attempt.note }
                if (status === 'failed' || status === 'error') {
                    payload.error = { code, message }
                    payload.vendor = data
                }
                return NextResponse.json(payload)
            }
            lastDetail = { statusCode: r.status, attempt: attempt.note, endpoint: attempt.url, bodyJson: parsed.asJson, bodyText: parsed.asText }
            if (r.status === 401) break
        }

        return NextResponse.json({ error: 'HeyGen poll failed', details: lastDetail }, { status: 502 })
    } catch (e: any) {
        return NextResponse.json({ error: 'Failed to poll HeyGen video', details: e?.message ?? String(e) }, { status: 500 })
    }
}
