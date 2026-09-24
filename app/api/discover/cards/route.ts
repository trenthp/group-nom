import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDiscoverCards, parseBBox } from '@/lib/discover'
import { ensureProfile, isUnlocked } from '@/lib/userProfile'

/**
 * POST /api/discover/cards  { bbox: "minLng,minLat,maxLng,maxLat", exclude: string[] }
 *
 * Ten random places from the view, minus the ones already seen this
 * sitting. POST because the exclude list grows past what a URL should
 * carry. Nothing is recorded — skips are not a signal.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to explore the map' }, { status: 401 })
  }

  let body: { bbox?: string; exclude?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const bbox = parseBBox(typeof body.bbox === 'string' ? body.bbox : null)
  if (!bbox) {
    return NextResponse.json({ error: 'bbox is required' }, { status: 400 })
  }
  const exclude = Array.isArray(body.exclude)
    ? body.exclude.filter((id): id is string => typeof id === 'string').slice(0, 500)
    : []

  try {
    const profile = await ensureProfile(userId)
    const places = await getDiscoverCards(bbox, { exclude, includePhotos: isUnlocked(profile) })
    return NextResponse.json({ places })
  } catch (error) {
    console.error('[API] discover cards:', error)
    return NextResponse.json({ error: 'Could not deal the cards' }, { status: 500 })
  }
}
