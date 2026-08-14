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

export async function POST(request: NextRequest) {
  try {
    // Sessions require sign-in (Aug 2026): the host is always a Clerk user,
    // so host authorization can be verified server-side on every host action.
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Sign in to start a group session' },
        { status: 401 }
      )
    }
    const restaurantLimit = getRestaurantLimit(true)

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

    // Build the deck directly from our own database (community signals included)
    const restaurants = await getDiscoveryDeck(
      location.lat,
      location.lng,
      filters.distance,
      restaurantLimit,
      {
        cuisines: filters.cuisines || [],
        preferLocal: filters.preferLocal !== false,
      }
    )

    // Create session metadata for tracking user tier
    const metadata: SessionMetadata = {
      creatorTier: getUserTier(true),
      creatorClerkId: clerkUserId,
      restaurantLimit,
      createdAt: Date.now(),
    }

    // Create session; the signed-in creator is the host
    const session = await sessionStore.createSession(
      code,
      clerkUserId,
      filters,
      restaurants,
      location,
      metadata
    )

    return NextResponse.json({
      success: true,
      session: {
        code: session.code,
        createdAt: session.createdAt,
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
