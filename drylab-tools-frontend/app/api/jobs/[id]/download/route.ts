export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'

const DEFAULT_BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8001'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const search = req.nextUrl.searchParams
  const backend = search.get('backend') || DEFAULT_BACKEND_URL
  const u = new URL(`${backend}/jobs/${params.id}/download`)
  const path = search.get('path')
  if (path) u.searchParams.set('path', path)
  const r = await fetch(u.toString(), { cache: 'no-store' })
  // Stream the response back to client, preserving headers
  const headers = new Headers(r.headers)
  headers.set('Cache-Control', 'no-store')
  return new Response(r.body, { status: r.status, headers })
}


