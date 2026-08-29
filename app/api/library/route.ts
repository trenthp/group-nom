import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getLibraryNearby } from '@/lib/restaurantDiscovery'
import { ensureProfile, isUnlocked } from '@/lib/userProfile'
import { getTodaysFive } from '@/lib/gate'
import { resolveTimeZone } from '@/lib/dailyLimit'

/**
 * GET /api/library?lat=..&lng=..&radius=..&tz=..
 *
 * The community library: nominated places near a location.
 * Positive-only by design - a place appears here because someone loves it.
 *
 * Pre-unlock members (no nomination yet) get Today's Five instead — the
 * same five across list, map and Discover, new at their local midnight —
 * plus the count of what their first nomination would open.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Sign in to browse the library' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const lat = parseFloat(params.get('lat') ?? '')
    const lng = parseFloat(params.get('lng') ?? '')
    const radiusKm = Math.min(parseFloat(params.get('radius') ?? '16'), 25)
    const limit = Math.min(parseInt(params.get('limit') ?? '50', 10), 100)

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json(
        { error: 'lat and lng are required' },
        { status: 400 }
      )
    }

    const profile = await ensureProfile(userId)

    if (!isUnlocked(profile)) {
      const tz = resolveTimeZone(params.get('tz'), profile.timezone)
      const five = await getTodaysFive(userId, tz, lat, lng)
      return NextResponse.json({
        success: true,
        places: five.places,
        limited: true,
        totalNearby: five.totalNearby,
      })
    }

    const places = await getLibraryNearby(lat, lng, radiusKm, limit)

    return NextResponse.json({ success: true, places, limited: false })
  } catch (error) {
    console.error('[API] Error fetching library:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
