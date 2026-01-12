import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getRestaurantNominations,
  getUserNomination,
  getCoNominators,
  getNominationCount
} from '@/lib/nominations'

interface RouteParams {
  params: Promise<{ restaurantId: string }>
}

/**
 * GET /api/nominations/restaurant/[restaurantId]
 * Get all nominations for a restaurant
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { restaurantId } = await params

    // Auth is optional - we show nominations to everyone
    // But we include extra data if the user is signed in
    const { userId } = await auth()

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

    // Get nominations for this restaurant
    const nominations = await getRestaurantNominations(restaurantId, limit)
    const nominationCount = await getNominationCount(restaurantId)

    // If user is signed in, also get their nomination and co-nominators
    let userNomination = null
    let coNominators: Array<{ clerkUserId: string; displayName?: string; avatarUrl?: string }> = []

    if (userId) {
      userNomination = await getUserNomination(restaurantId, userId)
      if (userNomination) {
        coNominators = await getCoNominators(userId, restaurantId)
      }
    }

    return NextResponse.json({
      nominations,
      nominationCount,
      userNomination,
      coNominators,
    })
  } catch (error) {
    console.error('[API] Error getting restaurant nominations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
