import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'
import { voteSchema, parseBody } from '@/lib/validation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const parsed = await parseBody(request, voteSchema)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      )
    }
    const { userId, restaurantId, liked } = parsed.data

    const session = await sessionStore.getSession(code)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Prevent voting on finished sessions
    if (session.status === 'finished') {
      return NextResponse.json(
        { error: 'Session has already ended. Voting is closed.' },
        { status: 403 }
      )
    }

    // Add vote
    await sessionStore.addVote(code, userId, restaurantId, liked)

    // Check if user finished voting
    const userFinished = await sessionStore.hasUserFinishedVoting(code, userId)
    const allFinished = await sessionStore.allUsersFinished(code)

    // Mark session as finished when all users complete voting
    if (allFinished) {
      await sessionStore.finishSession(code)
    }

    return NextResponse.json({
      success: true,
      userFinished,
      allFinished,
    })
  } catch (error) {
    console.error('Error adding vote:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
