/**
 * POST /api/restaurants/like
 *
 * When a user swipes right on a restaurant:
 * 1. Match the Google Place to our local database
 * 2. Add to user's favorites
 * 3. Increment like counts
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { addFavorite } from '@/lib/favorites'
import { GooglePlace } from '@/lib/restaurantMatcher'

interface LikeRequest {
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  categories?: string[]
  city?: string
  state?: string
  source?: 'swipe' | 'group_vote' | 'nomination'
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: LikeRequest = await request.json()

    // Validate required fields
    if (!body.place_id || !body.name || !body.lat || !body.lng) {
      return NextResponse.json(
        { error: 'Missing required fields: place_id, name, lat, lng' },
        { status: 400 }
      )
    }

    // Convert to GooglePlace format
    const googlePlace: GooglePlace = {
      place_id: body.place_id,
      name: body.name,
      address: body.address || '',
      lat: body.lat,
      lng: body.lng,
      categories: body.categories,
      city: body.city,
      state: body.state,
    }

    // Add to favorites (this handles matching + like count updates)
    const favorite = await addFavorite(
      userId,
      googlePlace,
      body.source || 'swipe'
    )

    return NextResponse.json({
      success: true,
      favorite: {
        id: favorite.id,
        localId: favorite.localId,
        googlePlaceId: favorite.googlePlaceId,
        source: favorite.source,
      },
    })
  } catch (error) {
    console.error('Error liking restaurant:', error)
    // Return success anyway to not break the swiping UX
    // The like just won't be saved
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      // Still return a stub so the UI doesn't break
      favorite: null,
    })
  }
}
