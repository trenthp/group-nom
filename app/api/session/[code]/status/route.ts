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

    const allFinished = sessionStore.allUsersFinished(code)
    const userFinished = userId
      ? sessionStore.hasUserFinishedVoting(code, userId)
      : false

    // Debug logging for single user issue
    console.log(`[STATUS] ${code}: users=${session.users.length}, votes=${session.votes.length}, allFinished=${allFinished}, restaurants=${session.restaurants.length}`)

    return NextResponse.json({
      success: true,
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
