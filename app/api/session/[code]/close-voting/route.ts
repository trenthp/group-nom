import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sessionStore } from '@/lib/sessionStore'
import { sql } from '@/lib/db'
import type { Session } from '@/lib/types'

/**
 * Record group wins for the session's winning restaurant(s).
 * Winners = highest yes count (ties share the win). Non-fatal on error.
 */
async function recordGroupWins(session: Session): Promise<void> {
  try {
    const yesCounts = new Map<string, number>()
    for (const vote of session.votes) {
      if (vote.liked) {
        yesCounts.set(vote.restaurantId, (yesCounts.get(vote.restaurantId) ?? 0) + 1)
      }
    }
    if (yesCounts.size === 0) return

    const maxYes = Math.max(...yesCounts.values())
    const winners = [...yesCounts.entries()]
      .filter(([, count]) => count === maxYes)
      .map(([id]) => id)

    await sql`
      UPDATE restaurants
      SET group_win_count = COALESCE(group_win_count, 0) + 1
      WHERE gers_id = ANY(${winners}::text[])
    `
  } catch (error) {
    console.warn('[API] Failed to record group wins:', error)
  }
}

export async function POST(
  _request: NextRequest,
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

    // Community signal: the winner earned a group win
    await recordGroupWins(session)

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
