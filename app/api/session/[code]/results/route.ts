import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const session = sessionStore.getSession(code)

    if (!session) {
      console.log(`[RESULTS] Session not found: ${code}`)
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    console.log(`[RESULTS] ${code}: users=${session.users.length}, votes=${session.votes.length}, status=${session.status}`)

    const results = sessionStore.calculateResults(code)

    if (!results) {
      console.log(`[RESULTS] ${code}: No matches found`)
      return NextResponse.json({
        success: true,
        results: null,
        message: 'No matches found',
      })
    }

    console.log(`[RESULTS] ${code}: Winner found - ${results.restaurant.name}`)

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
