import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDiscoveryDeck } from '@/lib/restaurantDiscovery'
import { getRestaurantLimit } from '@/lib/userTiers'

/**
 * POST /api/restaurants/nearby
 *
 * Build a voting deck from our own database (Overture-seeded,
 * community-nominated). No external APIs.
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth status to enforce tier-appropriate limits
    const { userId } = await auth()
    const isAuthenticated = !!userId
    const maxAllowedLimit = getRestaurantLimit(isAuthenticated)

    const { lat, lng, radius = 5000, limit = 8, filters, excludeIds = [] } = await request.json()

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'lat and lng are required' },
        { status: 400 }
      )
    }

    const effectiveLimit = Math.min(limit, maxAllowedLimit)
    const radiusKm = (typeof radius === 'number' && radius > 0 ? radius : 5000) / 1000
    const cuisines: string[] = filters?.cuisines || []
    const preferLocal = filters?.preferLocal !== false

    const restaurants = await getDiscoveryDeck(lat, lng, radiusKm, effectiveLimit, {
      cuisines,
      excludeIds: Array.isArray(excludeIds) ? excludeIds : [],
      preferLocal,
    })

    return NextResponse.json({
      success: true,
      restaurants,
      usingMockData: false,
      meta: {
        limit: effectiveLimit,
        maxAllowed: maxAllowedLimit,
        isLimited: limit > effectiveLimit,
        source: 'community',
      },
    })
  } catch (error) {
    console.error('Error building discovery deck:', error)
    return NextResponse.json(
      { error: 'Unable to find restaurants near that location' },
      { status: 500 }
    )
  }
}
