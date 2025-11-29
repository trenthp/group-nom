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

    const session = sessionStore.getSession(code)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Add user to session if userId provided and session is not finished
    // If session is finished, user can only view results (read-only)
    if (userId && session.status !== 'finished') {
      sessionStore.addUserToSession(code, userId)
    }

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
