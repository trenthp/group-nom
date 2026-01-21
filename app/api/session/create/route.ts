import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sessionStore } from '@/lib/sessionStore'
import { createSessionSchema, parseBody } from '@/lib/validation'
import { getLocalDataForPlaces, incrementTimesShown, ensureMappingsExist, type GooglePlace } from '@/lib/restaurantMatcher'
import { getRestaurantLimit, getUserTier } from '@/lib/userTiers'
import type { Restaurant, SessionMetadata } from '@/lib/types'

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

    // Fetch restaurants with tier-appropriate limit
    const response = await fetch(
      `${request.nextUrl.origin}/api/restaurants/nearby`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          radius: filters.distance * 1000, // Convert km to meters
          limit: restaurantLimit, // Use tier-based limit (5 for anon, 10 for auth)
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
    let restaurants: Restaurant[] = data.restaurants || []

    // Enrich restaurants with local database data (like counts, pick rates)
    if (restaurants.length > 0) {
      try {
        // First, ensure all restaurants have mappings in our database
        // This tracks ALL restaurants shown, not just ones users interact with
        const placesForMapping: GooglePlace[] = restaurants.map(r => ({
          place_id: r.id,
          name: r.name,
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          categories: r.cuisines,
        }))
        await ensureMappingsExist(placesForMapping)

        // Now fetch local data (all restaurants should have mappings)
        const placeIds = restaurants.map(r => r.id)
        const localData = await getLocalDataForPlaces(placeIds)

        // Add local data to each restaurant
        restaurants = restaurants.map(r => {
          const local = localData.get(r.id)
          if (local) {
            return {
              ...r,
              localId: local.local_id,
              likeCount: local.like_count,
              pickRate: local.pick_rate ?? undefined,
            }
          }
          return r
        })

        // Track that these restaurants were shown (for discovery scoring)
        await incrementTimesShown(placeIds)
      } catch (enrichError) {
        // Non-fatal: continue without local enrichment
        console.warn('[API] Failed to enrich with local data:', enrichError)
      }
    }

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
