import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'
import { selectRestaurantsForSession } from '@/lib/restaurantSelection'

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

    // Select restaurants from local Overture data + Foursquare enrichment
    const restaurants = await selectRestaurantsForSession({
      lat: location.lat,
      lng: location.lng,
      filters,
      limit: 10,
      excludeGersIds: excludeIds, // Don't show same restaurants again
    })

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json(
        { error: 'No restaurants found in this area. Try expanding your search radius or adjusting filters.' },
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
