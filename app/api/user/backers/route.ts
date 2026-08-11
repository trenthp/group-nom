import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getBackers, getUserSocialStats, getBackerMessage } from '@/lib/social'

/**
 * GET /api/user/backers
 * Get the current user's backers (others who also nominated their spots)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

    const [backerInfo, socialStats] = await Promise.all([
      getBackers(userId, limit),
      getUserSocialStats(userId),
    ])

    return NextResponse.json({
      ...backerInfo,
      socialStats,
      message: getBackerMessage(backerInfo.totalBackers),
    })
  } catch (error) {
    console.error('[API] Error getting backers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
