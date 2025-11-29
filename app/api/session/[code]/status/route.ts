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

    // Check if session was force-closed OR all users finished voting
    const votingFinished = await sessionStore.allUsersFinished(code)
    const allFinished = session.status === 'finished' || votingFinished

    const userFinished = userId
      ? await sessionStore.hasUserFinishedVoting(code, userId)
      : false

    return NextResponse.json({
      success: true,
      status: session.status,
      allFinished,
      userFinished,
      userCount: session.users.length,
      totalVotes: session.votes.length,
    })
  } catch (error) {
    console.error('Error checking status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
