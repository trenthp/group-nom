/**
 * GET /api/nominations/today?tz=America/New_York
 *
 * Has the member used today's nomination? Checked before the capture form
 * (and before the photo upload) so a blocked publish never orphans a photo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getProfile } from '@/lib/userProfile'
import { getDailyStatus, resolveTimeZone } from '@/lib/dailyLimit'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getProfile(userId)
    const tz = resolveTimeZone(request.nextUrl.searchParams.get('tz'), profile?.timezone)
    const status = await getDailyStatus(userId, tz)

    return NextResponse.json(status)
  } catch (error) {
    console.error('[API] Daily status failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
