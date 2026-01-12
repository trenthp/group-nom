import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'
import type { FoodMethod } from '@/lib/types'

const VALID_METHODS: FoodMethod[] = ['dine_in', 'pickup', 'delivery']

interface RouteParams {
  params: Promise<{ code: string }>
}

/**
 * GET /api/session/[code]/food-method
 * Get food method vote tallies and current result
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { code } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    const session = await sessionStore.getSession(code)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const tallies = await sessionStore.getFoodMethodTallies(code)
    const isHost = userId ? await sessionStore.isHost(code, userId) : false
    const userVote = userId && session.foodMethodVotes ? session.foodMethodVotes[userId] : null

    return NextResponse.json({
      tallies,
      result: session.foodMethodResult ?? null,
      userVote,
      isHost,
    })
  } catch (error) {
    console.error('[API] Error getting food method:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/session/[code]/food-method
 * Cast a food method vote (any user) or set final result (host only)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { code } = await params
    const body = await request.json()
    const { userId, method, setResult } = body

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!method || !VALID_METHODS.includes(method)) {
      return NextResponse.json(
        { error: `Invalid method. Valid options: ${VALID_METHODS.join(', ')}` },
        { status: 400 }
      )
    }

    const session = await sessionStore.getSession(code)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if user is part of the session
    if (!session.users.includes(userId)) {
      return NextResponse.json(
        { error: 'User is not part of this session' },
        { status: 403 }
      )
    }

    // If setResult is true, this is the host setting the final result
    if (setResult) {
      const isHost = session.hostId === userId
      if (!isHost) {
        return NextResponse.json(
          { error: 'Only the host can set the final result' },
          { status: 403 }
        )
      }

      const success = await sessionStore.setFoodMethodResult(code, userId, method)
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to set food method result' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        result: method,
        message: `Food method set to ${method.replace('_', ' ')}`,
      })
    }

    // Otherwise, this is a regular vote
    const success = await sessionStore.voteFoodMethod(code, userId, method)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record vote' },
        { status: 500 }
      )
    }

    // Get updated tallies
    const tallies = await sessionStore.getFoodMethodTallies(code)

    return NextResponse.json({
      success: true,
      tallies,
      userVote: method,
    })
  } catch (error) {
    console.error('[API] Error handling food method:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
