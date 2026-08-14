import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sessionStore } from '@/lib/sessionStore'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // Sessions are members-only; the requester's identity comes from Clerk.
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Sign in to join this group' },
        { status: 401 }
      )
    }

    const session = await sessionStore.getSession(code)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Join the requester into the session unless it's already finished
    // (finished sessions are read-only)
    if (session.status !== 'finished' && !session.users.includes(userId)) {
      await sessionStore.addUserToSession(code, userId)
      session.users.push(userId)
    }

    // Calculate per-user voting status for host view (no ids exposed)
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
        // Per-requester flag instead of exposing hostId to every member
        isHost: userId === session.hostId,
        userCount: session.users.length,
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
