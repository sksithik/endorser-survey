import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const key = process.env.HEYGEN_API_KEY
    const base = process.env.HEYGEN_BASE_URL || 'https://api.heygen.com'
    if (!key) return NextResponse.json({ error: 'Server missing HEYGEN_API_KEY' }, { status: 500 })

    const r = await fetch(`${base}/v2/voices`, {
      headers: { 'Accept': 'application/json', 'X-Api-Key': key },
      cache: 'no-store',
    })
    const text = await r.text().catch(() => '')
    let data: any = null
    try { data = JSON.parse(text) } catch {}
    if (!r.ok) return NextResponse.json({ error: 'Failed to list voices', statusCode: r.status, body: text }, { status: 502 })
    const items = Array.isArray(data?.data) ? data.data : []
    return NextResponse.json({ data: items })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unhandled error', details: e?.message ?? String(e) }, { status: 500 })
  }
}
