import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'
import { selectRestaurantsForSession } from '@/lib/restaurantSelection'

function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function generateUserId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export async function POST(request: NextRequest) {
  try {
    const { filters, location } = await request.json()

    // Validate inputs
    if (!filters || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate session code and user ID server-side
    const code = generateSessionCode()
    const userId = generateUserId()

    // Select restaurants from local Overture data + Foursquare enrichment
    const restaurants = await selectRestaurantsForSession({
      lat: location.lat,
      lng: location.lng,
      filters,
      limit: 10,
    })

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json(
        { error: 'No restaurants found in this area. Try expanding your search radius or adjusting filters.' },
        { status: 404 }
      )
    }

    // Create session
    const session = await sessionStore.createSession(
      code,
      userId,
      filters,
      restaurants,
      location
    )

    return NextResponse.json({
      success: true,
      userId,
      session: {
        code: session.code,
        createdAt: session.createdAt,
        users: session.users,
        filters: session.filters,
        restaurantCount: session.restaurants.length,
      },
    })
  } catch (error) {
    console.error('[API] Error creating session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
