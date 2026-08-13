import { NextRequest, NextResponse } from 'next/server'
import { getLibraryNearby } from '@/lib/restaurantDiscovery'

/**
 * GET /api/library?lat=..&lng=..&radius=..
 *
 * The community library: nominated places near a location.
 * Positive-only by design - a place appears here because someone loves it.
 */
export async function GET(request: NextRequest) {
  try {
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

    const places = await getLibraryNearby(lat, lng, radiusKm, limit)

    return NextResponse.json({ success: true, places })
  } catch (error) {
    console.error('[API] Error fetching library:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
