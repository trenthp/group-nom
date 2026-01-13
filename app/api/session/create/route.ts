import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'
import { createSessionSchema, parseBody } from '@/lib/validation'

function generateSessionCode(): string {
  // Use crypto for better randomness and check for collisions
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars (0/O, 1/I/L)
  let code = ''
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  for (let i = 0; i < 6; i++) {
    code += chars[array[i] % chars.length]
  }
  return code
}

function generateUserId(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return `user-${Array.from(array, b => b.toString(16).padStart(2, '0')).join('')}`
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, createSessionSchema)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      )
    }
    const { filters, location } = parsed.data

    // Generate session code with collision detection
    let code = generateSessionCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = await sessionStore.getSession(code)
      if (!existing) break
      code = generateSessionCode()
      attempts++
    }
    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Unable to generate unique session code. Please try again.' },
        { status: 503 }
      )
    }

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
