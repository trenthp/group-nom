import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'

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
