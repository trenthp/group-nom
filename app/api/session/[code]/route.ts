import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const session = await sessionStore.getSession(code)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Add user to session if userId provided and session is not finished
    // If session is finished, user can only view results (read-only)
    if (userId && session.status !== 'finished') {
      await sessionStore.addUserToSession(code, userId)
    }

    // Calculate per-user voting status for host view
    const totalRestaurants = session.restaurants.length
    const userStatus = session.users.map((uid, index) => {
      const userVotes = session.votes.filter(v => v.userId === uid)
      return {
        userIndex: index + 1,
        finished: userVotes.length >= totalRestaurants,
        voteCount: userVotes.length,
        isHost: uid === session.hostId,
      }
    })

    return NextResponse.json({
      success: true,
      session: {
        code: session.code,
        createdAt: session.createdAt,
        status: session.status,
        hostId: session.hostId,
        users: session.users,
        filters: session.filters,
        restaurants: session.restaurants,
        location: session.location,
        finished: session.finished,
        userStatus,
        totalRestaurants,
      },
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
