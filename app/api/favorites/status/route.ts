import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getFavoriteStatus } from '@/lib/favorites'

/**
 * POST /api/favorites/status  { ids: string[] }
 * Which of these places are on the member's to-try list.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: { ids?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === 'string').slice(0, 500)
    : []

  try {
    const saved = await getFavoriteStatus(userId, ids)
    return NextResponse.json({ saved: Array.from(saved) })
  } catch (error) {
    console.error('[API] favorites status:', error)
    return NextResponse.json({ saved: [] })
  }
}
