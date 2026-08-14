import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sessionStore } from '@/lib/sessionStore'

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

    // Only host can set reconfiguring
    if (session.hostId !== userId) {
      return NextResponse.json(
        { error: 'Only the host can reconfigure the session' },
        { status: 403 }
      )
    }

    await sessionStore.setReconfiguring(code)

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
