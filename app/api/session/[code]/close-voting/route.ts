import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'
import { closeVotingSchema, parseBody } from '@/lib/validation'
import { recordVotingOutcome, getLocalDataForPlaces } from '@/lib/restaurantMatcher'

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

    // Record voting outcomes for pick_rate scoring (non-blocking)
    try {
      const participantCount = session.users.length
      const placeIds = session.restaurants.map(r => r.id)
      const localData = await getLocalDataForPlaces(placeIds)

      // Calculate vote counts per restaurant
      const votesByRestaurant = new Map<string, { yes: number; no: number }>()
      for (const restaurant of session.restaurants) {
        votesByRestaurant.set(restaurant.id, { yes: 0, no: 0 })
      }
      for (const vote of session.votes) {
        const counts = votesByRestaurant.get(vote.restaurantId)
        if (counts) {
          if (vote.liked) {
            counts.yes++
          } else {
            counts.no++
          }
        }
      }

      // Find the winner(s) - restaurants with highest yes votes
      let maxYesVotes = 0
      for (const counts of votesByRestaurant.values()) {
        if (counts.yes > maxYesVotes) {
          maxYesVotes = counts.yes
        }
      }
      const winnerIds = new Set<string>()
      for (const [id, counts] of votesByRestaurant.entries()) {
        if (counts.yes === maxYesVotes && counts.yes > 0) {
          winnerIds.add(id)
        }
      }

      // Record outcome for each restaurant
      for (const restaurant of session.restaurants) {
        const counts = votesByRestaurant.get(restaurant.id) || { yes: 0, no: 0 }
        const local = localData.get(restaurant.id)
        const wasPicked = winnerIds.has(restaurant.id)

        await recordVotingOutcome(
          restaurant.id,
          local?.local_id || null,
          wasPicked,
          counts.yes,
          counts.no,
          participantCount
        )
      }
    } catch (outcomeError) {
      // Non-fatal: log but don't fail the request
      console.warn('[API] Failed to record voting outcomes:', outcomeError)
    }

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
