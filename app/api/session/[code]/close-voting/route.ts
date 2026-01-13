import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'
import { closeVotingSchema, parseBody } from '@/lib/validation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const parsed = await parseBody(request, closeVotingSchema)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      )
    }
    const { userId } = parsed.data

    const session = await sessionStore.getSession(code)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Only host can close voting
    if (session.hostId !== userId) {
      return NextResponse.json(
        { error: 'Only the host can close voting' },
        { status: 403 }
      )
    }

    // Mark session as finished
    await sessionStore.finishSession(code)

    return NextResponse.json({
      success: true,
      message: 'Voting closed',
    })
  } catch (error) {
    console.error('Error closing voting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
