import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'
import { getDiscoveryDeck } from '@/lib/restaurantDiscovery'

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

    // Build a fresh deck directly from our own database
    const restaurants = await getDiscoveryDeck(
      location.lat,
      location.lng,
      filters.distance,
      10,
      {
        cuisines: filters.cuisines || [],
        preferLocal: filters.preferLocal !== false,
      }
    )

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
