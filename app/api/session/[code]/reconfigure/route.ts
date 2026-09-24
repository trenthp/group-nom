import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sessionStore } from '@/lib/sessionStore'
import { reconfigureSessionSchema, parseBody } from '@/lib/validation'
import { buildDeck } from '@/lib/deckSources'
import { getGroupWithMembers } from '@/lib/groups'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // Host identity is verified server-side, never trusted from the client
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Sign in required' },
        { status: 401 }
      )
    }

    const parsed = await parseBody(request, reconfigureSessionSchema)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      )
    }
    const { filters, location } = parsed.data

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

    // Deck source: the request wins, else whatever the session was made with
    const deckSource = parsed.data.deckSource ?? session.metadata?.deckSource ?? 'mix'
    const groupId = parsed.data.groupId ?? session.metadata?.groupId
    let groupMemberIds: string[] | undefined
    if (deckSource === 'group') {
      const group = groupId ? await getGroupWithMembers(groupId, userId) : null
      // getGroupWithMembers already verifies the host is owner or member
      if (!group) {
        return NextResponse.json(
          { error: 'Pick one of your saved groups to build a deck from its favorites' },
          { status: 400 }
        )
      }
      groupMemberIds = Array.from(new Set([group.ownerId, ...group.members.map(m => m.clerkUserId)]))
    }

    // Build a fresh deck from the chosen source
    const deck = await buildDeck(deckSource, {
      lat: location.lat,
      lng: location.lng,
      radiusKm: filters.distance,
      limit: session.metadata?.restaurantLimit ?? 10,
      cuisines: filters.cuisines || [],
      preferLocal: filters.preferLocal !== false,
      groupMemberIds,
    })
    const restaurants = deck.restaurants

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
        deckSource: deck.source,
        deckFellBack: deck.fellBack,
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
