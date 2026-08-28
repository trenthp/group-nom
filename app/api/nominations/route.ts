import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createNomination, getUserNominations } from '@/lib/nominations'
import { ensureProfile, canPublish, updateProfile } from '@/lib/userProfile'
import { deleteDraft } from '@/lib/drafts'
import {
  resolveTimeZone,
  getDailyStatus,
  limitMessage,
  DAILY_LIMIT_CONSTRAINT,
} from '@/lib/dailyLimit'

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

    // The row must exist before the count trigger fires, or the first
    // nomination never unlocks the library.
    const profile = await ensureProfile(userId)
    if (!canPublish(profile)) {
      return NextResponse.json(
        { error: 'Your account is read-only right now' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { gersId, photoUrl, whyILoveIt } = body

    // One per local day. The browser's zone wins; the profile's last-known
    // zone is the fallback; UTC if neither.
    const timezone = resolveTimeZone(body.timezone, profile.timezone)
    const daily = await getDailyStatus(userId, timezone)
    if (daily.usedToday) {
      return NextResponse.json(
        { error: limitMessage(daily), code: 'DAILY_LIMIT', resetsAt: daily.resetsAt },
        { status: 429 }
      )
    }

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
      whyILoveIt.trim(),
      { localDate: daily.localDate, timezone }
    )

    // Remember the zone so status checks without a tz param stay right,
    // and retire the draft this nomination came from (if any)
    await Promise.all([
      profile.timezone !== timezone
        ? updateProfile(userId, { timezone }).catch(() => { /* non-fatal */ })
        : Promise.resolve(),
      deleteDraft(userId, gersId).catch(() => { /* non-fatal */ }),
    ])

    return NextResponse.json({ nomination }, { status: 201 })
  } catch (error: any) {
    // Two nominations raced the daily limit; the index decided
    if (error?.code === '23505' && error?.constraint === DAILY_LIMIT_CONSTRAINT) {
      return NextResponse.json(
        { error: "You've already nominated a place today. Come back tomorrow.", code: 'DAILY_LIMIT' },
        { status: 429 }
      )
    }
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
