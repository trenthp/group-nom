import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDiscoverViewport, parseBBox } from '@/lib/discover'
import { ensureProfile, isUnlocked } from '@/lib/userProfile'

/**
 * GET /api/discover?bbox=minLng,minLat,maxLng,maxLat
 *
 * The map as we have it, for the current view. Open to every member —
 * the data is public seed plus a love count. Photos only for unlocked
 * members. The server picks hexes vs points from the box size.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to explore the map' }, { status: 401 })
  }

  const bbox = parseBBox(request.nextUrl.searchParams.get('bbox'))
  if (!bbox) {
    return NextResponse.json({ error: 'bbox is required' }, { status: 400 })
  }

  try {
    const profile = await ensureProfile(userId)
    const viewport = await getDiscoverViewport(bbox, { includePhotos: isUnlocked(profile) })
    return NextResponse.json(viewport)
  } catch (error) {
    if (error instanceof Error && error.message === 'Viewport too large') {
      return NextResponse.json({ error: 'Zoom in a little' }, { status: 400 })
    }
    console.error('[API] discover viewport:', error)
    return NextResponse.json({ error: 'Could not load the map' }, { status: 500 })
  }
}
