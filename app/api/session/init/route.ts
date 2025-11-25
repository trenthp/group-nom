import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '@/lib/sessionStore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, userId } = body

    // Validation
    if (!code || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: code, userId' },
        { status: 400 }
      )
    }

    // Check if session already exists
    const existingSession = sessionStore.getSession(code)
    if (existingSession) {
      return NextResponse.json(
        { error: 'Session already exists' },
        { status: 409 }
      )
    }

    // Create pending session
    const session = sessionStore.initPendingSession(code, userId)

    return NextResponse.json({
      success: true,
      code: session.code,
      status: session.status,
    })
  } catch (error) {
    console.error('Failed to initialize session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
