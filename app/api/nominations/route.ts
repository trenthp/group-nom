import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createNomination, getUserNominations } from '@/lib/nominations'

/**
 * GET /api/nominations
 * Get the current user's nominations
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)

    const nominations = await getUserNominations(userId, limit)

    return NextResponse.json({ nominations })
  } catch (error) {
    console.error('[API] Error getting nominations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/nominations
 * Create a new nomination (quick capture)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { gersId, photoUrl, whyILoveIt } = body

    // Validate required fields
    if (!gersId || typeof gersId !== 'string') {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    if (!photoUrl || typeof photoUrl !== 'string') {
      return NextResponse.json(
        { error: 'Photo URL is required' },
        { status: 400 }
      )
    }

    if (!whyILoveIt || typeof whyILoveIt !== 'string' || whyILoveIt.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please tell us why you love this place (at least 10 characters)' },
        { status: 400 }
      )
    }

    if (whyILoveIt.length > 500) {
      return NextResponse.json(
        { error: 'Description must be under 500 characters' },
        { status: 400 }
      )
    }

    const nomination = await createNomination(
      gersId,
      userId,
      photoUrl,
      whyILoveIt.trim()
    )

    return NextResponse.json({ nomination }, { status: 201 })
  } catch (error: any) {
    // Handle unique constraint violation (user already nominated this restaurant)
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'You have already nominated this restaurant' },
        { status: 409 }
      )
    }

    console.error('[API] Error creating nomination:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
