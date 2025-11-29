import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    const session = sessionStore.getSession(code)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Only host can set reconfiguring
    if (session.hostId !== userId) {
      return NextResponse.json(
        { error: 'Only the host can reconfigure the session' },
        { status: 403 }
      )
    }

    sessionStore.setReconfiguring(code)

    return NextResponse.json({
      success: true,
      status: 'reconfiguring',
    })
  } catch (error) {
    console.error('Error setting reconfiguring:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
