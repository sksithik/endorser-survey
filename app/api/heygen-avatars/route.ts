import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const key = process.env.HEYGEN_API_KEY
    const base = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com'
    if (!key) return NextResponse.json({ error: 'Server missing HEYGEN_API_KEY' }, { status: 500 })
    const { searchParams } = new URL(req.url)
    const publicOnly = searchParams.get('publicOnly') === 'true'

    const r = await fetch(`${base}/v2/avatars`, {
      headers: { 'Accept': 'application/json', 'X-Api-Key': key },
      cache: 'no-store',
    })
    const text = await r.text().catch(() => '')
    let data: any = null
    try { data = JSON.parse(text) } catch {}
    if (!r.ok) return NextResponse.json({ error: 'Failed to list avatars', statusCode: r.status, body: text }, { status: 502 })

    let items = Array.isArray(data?.data) ? data.data : []
    if (publicOnly) {
      items = items.filter((a: any) => a?.is_public || /_public$/.test(a?.avatar_id || ''))
    }
    return NextResponse.json({ data: items })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unhandled error', details: e?.message ?? String(e) }, { status: 500 })
  }
}
