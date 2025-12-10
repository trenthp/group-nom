import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'
import { recordVotingOutcomes } from '@/lib/restaurantSelection'

// Feature flag: use new data layer
const USE_LOCAL_DATA = process.env.USE_LOCAL_DATA === 'true'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const session = await sessionStore.getSession(code)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const results = await sessionStore.calculateResults(code)

    // Record voting outcomes to our database (for pick_rate analytics)
    if (USE_LOCAL_DATA && results && session.status === 'finished') {
      try {
        // Build vote map from results
        const voteMap = new Map<string, { yesCount: number; noCount: number }>()
        if (results.allVotes) {
          for (const vote of results.allVotes) {
            const yesCount = vote.yesCount || 0
            const noCount = Object.keys(vote.userVotes || {}).length - yesCount
            voteMap.set(vote.restaurant.id, { yesCount, noCount })
          }
        }

        // Get winner ID
        const winnerGersId = results.restaurant?.id || null

        // Extract city from location if available (for analytics)
        const city = session.location ? undefined : undefined // Could reverse geocode

        await recordVotingOutcomes(
          session.restaurants,
          voteMap,
          winnerGersId,
          session.users.length,
          city
        )
      } catch (error) {
        // Don't fail the request if analytics recording fails
        console.error('[API] Failed to record voting outcomes:', error)
      }
    }

    if (!results) {
      return NextResponse.json({
        success: true,
        results: null,
        message: 'No matches found',
      })
    }

    return NextResponse.json({
      success: true,
      results,
      session: {
        code: session.code,
        userCount: session.users.length,
      },
    })
  } catch (error) {
    console.error('Error calculating results:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
