/**
 * GET /api/members/[id]
 *
 * A member as seen by others: First L., avatar, their nominations. Addressed
 * by the opaque profile UUID — never the Clerk id. Anti-clout: no follower
 * counts, no lists, no trust, nothing rankable. Deleted members 404.
 *
 * When the requester is looking at their own page, `isSelf` is true and the
 * response also carries the private ladder state.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getProfileById, toPublicMember, isUnlocked, canPublish } from '@/lib/userProfile'
import { getUserNominations } from '@/lib/nominations'
import { getDailyStatus, resolveTimeZone } from '@/lib/dailyLimit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Sign in to view members' }, { status: 401 })
    }

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const profile = await getProfileById(id)
    if (!profile) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const isSelf = profile.clerkUserId === userId
    const tz = resolveTimeZone(request.nextUrl.searchParams.get('tz'), profile.timezone)
    const [nominations, daily] = await Promise.all([
      getUserNominations(profile.clerkUserId, 100),
      isSelf ? getDailyStatus(userId, tz) : Promise.resolve(null),
    ])

    return NextResponse.json({
      member: toPublicMember(profile),
      nominations,
      isSelf,
      ...(isSelf && daily
        ? {
            self: {
              isUnlocked: isUnlocked(profile),
              canPublish: canPublish(profile),
              nominationCount: profile.nominationCount,
              status: profile.status,
              usedToday: daily.usedToday,
              resetsAt: daily.resetsAt,
            },
          }
        : {}),
    })
  } catch (error) {
    console.error('[API] Error loading member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
