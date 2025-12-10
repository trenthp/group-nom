import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'
import { selectRestaurantsForSession } from '@/lib/restaurantSelection'
import { fetchNearbyRestaurants } from '@/lib/googleMaps'

// Feature flag: use new data layer or fall back to Google
const USE_LOCAL_DATA = process.env.USE_LOCAL_DATA === 'true'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
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

    // Get previously shown restaurant IDs to exclude
    const excludeIds = session.restaurants.map(r => r.id)

    let restaurants

    if (USE_LOCAL_DATA) {
      // New path: Use local Overture data + Foursquare enrichment
      try {
        restaurants = await selectRestaurantsForSession({
          lat: location.lat,
          lng: location.lng,
          filters,
          limit: 10,
          excludeGersIds: excludeIds, // Don't show same restaurants again
        })

        // If no results from local data, fall back to Google
        if (restaurants.length === 0) {
          console.log('[API] No local results, falling back to Google')
          restaurants = await fetchNearbyRestaurants(
            location.lat,
            location.lng,
            filters.distance * 1000,
            filters
          )
        }
      } catch (error) {
        console.error('[API] Local data error, falling back to Google:', error)
        restaurants = await fetchNearbyRestaurants(
          location.lat,
          location.lng,
          filters.distance * 1000,
          filters
        )
      }
    } else {
      // Legacy path: Use Google Places API
      restaurants = await fetchNearbyRestaurants(
        location.lat,
        location.lng,
        filters.distance * 1000,
        filters
      )
    }

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json(
        { error: 'No restaurants found in this area' },
        { status: 404 }
      )
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
