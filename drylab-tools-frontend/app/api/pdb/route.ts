export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8001'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim()
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  try {
    const resp = await fetch(`${BACKEND_URL}/pdb?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
    if (!resp.ok) {
      throw new Error(`Backend error ${resp.status}`)
    }
    const data = await resp.json()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}


