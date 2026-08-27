/**
 * GET /api/restaurants/search?q=&lat=&lng=
 *
 * Name search near the member, for the nominate flow. Members only
 * (middleware); rate limited with the other restaurant lookups.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { searchRestaurantsByName } from '@/lib/restaurantSearch'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Sign in to search' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const q = (params.get('q') ?? '').slice(0, 80)
    const lat = parseFloat(params.get('lat') ?? '')
    const lng = parseFloat(params.get('lng') ?? '')

    if (q.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: 'A location is required to search nearby' }, { status: 400 })
    }

    const results = await searchRestaurantsByName(q, lat, lng)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('[API] Restaurant search failed:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
