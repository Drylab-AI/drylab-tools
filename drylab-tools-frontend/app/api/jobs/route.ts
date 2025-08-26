export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8001'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const backend = req.nextUrl.searchParams.get('backend') || DEFAULT_BACKEND_URL
  try {
    const resp = await fetch(`${backend}/jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body),
    })
    if (!resp.ok) throw new Error(`Backend ${resp.status}`)
    const data = await resp.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}


