export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8001'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const backend = req.nextUrl.searchParams.get('backend') || DEFAULT_BACKEND_URL
  try {
    const r = await fetch(`${backend}/jobs/${params.id}/log`, { method: 'GET', cache: 'no-store' })
    if (!r.ok) return NextResponse.json({ error: 'Upstream error' }, { status: r.status, headers: { 'Cache-Control': 'no-store' } })
    const data = await r.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch log' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}


