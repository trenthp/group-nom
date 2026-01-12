import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserStats } from '@/lib/userProfile'

/**
 * GET /api/user/stats
 * Get the current user's stats (nominations, enrichments, favorites, backers)
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stats = await getUserStats(userId)

    if (!stats) {
      return NextResponse.json(
        { error: 'Profile not found. Please create a profile first.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('[API] Error getting user stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
