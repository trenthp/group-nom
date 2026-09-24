import { NextRequest, NextResponse } from 'next/server'
import { getLocalTease } from '@/lib/teaser'

/**
 * GET /api/tease — public. The landing page's hook: how many places are
 * loved near the visitor. Location comes from Vercel's geo headers (no
 * browser prompt on a marketing page), falling back to a global count.
 * A count only: never a name, a photo, or a member.
 */
export async function GET(request: NextRequest) {
  const lat = parseFloat(request.headers.get('x-vercel-ip-latitude') ?? '')
  const lng = parseFloat(request.headers.get('x-vercel-ip-longitude') ?? '')
  const cityHeader = request.headers.get('x-vercel-ip-city')
  const city = cityHeader ? safeDecode(cityHeader) : null

  try {
    const tease = await getLocalTease(
      Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
    )
    return NextResponse.json(
      { ...tease, city: tease.scope === 'nearby' ? city : null },
      { headers: { 'Cache-Control': 'private, max-age=300' } }
    )
  } catch (error) {
    console.error('[API] tease:', error)
    return NextResponse.json({ count: 0, city: null, scope: 'everywhere' })
  }
}

// Vercel percent-encodes non-ASCII city names
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
