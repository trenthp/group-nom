import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'

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

    // Fetch restaurants with filters
    const response = await fetch(
      `${request.nextUrl.origin}/api/restaurants/nearby`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          radius: filters.distance * 1000, // Convert km to meters
          limit: 10,
          filters,
        }),
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch restaurants' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const restaurants = data.restaurants || []

    // Create session
    const session = sessionStore.createSession(
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
