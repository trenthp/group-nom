/**
 * GET /api/feed?limit=
 * Places loved by the people you follow, newest first.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getFeed } from '@/lib/follows'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const limit = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10) || 20, 1), 50)
    const items = await getFeed(userId, limit)
    return NextResponse.json({ items })
  } catch (error) {
    console.error('[API] Feed failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
