import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sessionStore } from '@/lib/sessionStore'
import { getLocalDataForPlaces, incrementTimesShown, ensureMappingsExist, type GooglePlace } from '@/lib/restaurantMatcher'
import { getRestaurantLimit } from '@/lib/userTiers'
import type { Restaurant } from '@/lib/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Get auth status for tier-appropriate limits
    const { userId: clerkUserId } = await auth()
    const isAuthenticated = !!clerkUserId
    const restaurantLimit = getRestaurantLimit(isAuthenticated)

    const { code } = await params
    const { userId, filters, location } = await request.json()

    if (!userId || !filters || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const session = await sessionStore.getSession(code)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Only host can reconfigure
    if (session.hostId !== userId) {
      return NextResponse.json(
        { error: 'Only the host can reconfigure the session' },
        { status: 403 }
      )
    }

    // Fetch new restaurants with updated filters
    const response = await fetch(
      `${request.nextUrl.origin}/api/restaurants/nearby`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
          radius: filters.distance * 1000,
          limit: restaurantLimit,
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

    // Reconfigure the session
    const updatedSession = await sessionStore.reconfigureSession(
      code,
      filters,
      restaurants,
      location
    )

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Failed to reconfigure session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      session: {
        code: updatedSession.code,
        status: updatedSession.status,
        restaurantCount: updatedSession.restaurants.length,
      },
    })
  } catch (error) {
    console.error('Error reconfiguring session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
