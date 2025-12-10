import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'
import { selectRestaurantsForSession } from '@/lib/restaurantSelection'
import { fetchNearbyRestaurants } from '@/lib/googleMaps'

function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function generateUserId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

// Feature flag: use new data layer or fall back to Google
const USE_LOCAL_DATA = process.env.USE_LOCAL_DATA === 'true'

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

    let restaurants

    if (USE_LOCAL_DATA) {
      // New path: Use local Overture data + Foursquare enrichment
      try {
        restaurants = await selectRestaurantsForSession({
          lat: location.lat,
          lng: location.lng,
          filters,
          limit: 10,
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
