import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sessionStore } from '@/lib/sessionStore'
import { createSessionSchema, parseBody } from '@/lib/validation'
import { getDiscoveryDeck } from '@/lib/restaurantDiscovery'
import { getRestaurantLimit, getUserTier } from '@/lib/userTiers'
import type { SessionMetadata } from '@/lib/types'

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
    // Get auth status for tier-appropriate limits
    const { userId: clerkUserId } = await auth()
    const isAuthenticated = !!clerkUserId
    const restaurantLimit = getRestaurantLimit(isAuthenticated)

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

    // Use Clerk userId if authenticated, otherwise generate anonymous userId
    const userId = clerkUserId || generateUserId()

    // Build the deck directly from our own database (community signals included)
    const restaurants = await getDiscoveryDeck(
      location.lat,
      location.lng,
      filters.distance,
      restaurantLimit, // Tier-based limit (5 for anon, 10 for auth)
      {
        cuisines: filters.cuisines || [],
        preferLocal: filters.preferLocal !== false,
      }
    )

    // Create session metadata for tracking user tier
    const metadata: SessionMetadata = {
      creatorTier: getUserTier(isAuthenticated),
      creatorClerkId: clerkUserId,
      restaurantLimit,
      createdAt: Date.now(),
    }

    // Create session with metadata
    const session = await sessionStore.createSession(
      code,
      userId,
      filters,
      restaurants,
      location,
      metadata
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
        isAuthenticated, // Let client know if session has elevated limits
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
