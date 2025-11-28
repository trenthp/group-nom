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
    console.log('[API] POST /api/session/create called')
    const { filters, location } = await request.json()
    console.log('[API] Request data:', { filters, location })

    // Validate inputs
    if (!filters || !location) {
      console.error('[API] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate session code and user ID server-side
    const code = generateSessionCode()
    const userId = generateUserId()

    console.log('[API] Generated code:', code, 'userId:', userId)
    console.log('[API] Fetching restaurants...')

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
      console.error('[API] Failed to fetch restaurants, status:', response.status)
      return NextResponse.json(
        { error: 'Failed to fetch restaurants' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const restaurants = data.restaurants || []
    console.log('[API] Fetched', restaurants.length, 'restaurants')

    // Create session
    console.log('[API] Creating new session in store...')
    const session = sessionStore.createSession(
      code,
      userId,
      filters,
      restaurants,
      location
    )
    console.log('[API] Session created successfully:', code)

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
