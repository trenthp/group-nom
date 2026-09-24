/**
 * POST /api/restaurants/community
 *   body: { name, address }
 *
 * The add-a-place fallback: a member searched and the place isn't in the
 * seed. Geocode the address, refuse to create a twin of a seeded row
 * (409 with the match), otherwise insert with source='community' and
 * H3 indexes so it joins decks and nearby queries like any other row.
 * Members only; rate limited like uploads (creating places is rare).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { ensureProfile, canPublish } from '@/lib/userProfile'
import { forwardGeocode } from '@/lib/geocode'
import { getH3Index, haversineDistance, DEFAULT_RESOLUTION, FINE_RESOLUTION } from '@/lib/h3'

const TWIN_RADIUS_KM = 0.3
const TWIN_SIMILARITY = 0.45

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureProfile(userId)
    if (!canPublish(profile)) {
      return NextResponse.json({ error: 'Your account is read-only right now' }, { status: 403 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    const address = typeof body.address === 'string' ? body.address.trim() : ''

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: 'Give the place a name (2–120 characters)' }, { status: 400 })
    }
    if (address.length < 5 || address.length > 200) {
      return NextResponse.json({ error: 'A street address helps us put it on the map' }, { status: 400 })
    }

    const geo = await forwardGeocode(address)
    if (!geo) {
      return NextResponse.json(
        { error: "We couldn't find that address. Try adding the city or zip." },
        { status: 422 }
      )
    }

    // Don't create a twin: a similar name within ~300m is the same place
    const dLat = TWIN_RADIUS_KM / 111
    const dLng = TWIN_RADIUS_KM / (111 * Math.max(Math.cos((geo.lat * Math.PI) / 180), 0.2))
    const twins = await sql`
      SELECT gers_id, name, address, city, lat, lng, nomination_count,
             similarity(name, ${name}) AS score
      FROM restaurants
      WHERE lat BETWEEN ${geo.lat - dLat} AND ${geo.lat + dLat}
        AND lng BETWEEN ${geo.lng - dLng} AND ${geo.lng + dLng}
        AND similarity(name, ${name}) >= ${TWIN_SIMILARITY}
      ORDER BY score DESC
      LIMIT 3
    `
    const twin = (twins as Record<string, unknown>[])
      .map(t => ({
        id: t.gers_id as string,
        name: t.name as string,
        address: [t.address, t.city].filter(Boolean).join(', '),
        nominationCount: (t.nomination_count as number) ?? 0,
        distanceKm: Math.round(haversineDistance(geo.lat, geo.lng, t.lat as number, t.lng as number) * 100) / 100,
      }))
      .find(t => t.distanceKm <= TWIN_RADIUS_KM)
    if (twin) {
      return NextResponse.json(
        { error: 'That place looks like it’s already on the map', existing: twin },
        { status: 409 }
      )
    }

    // cmty_ + 20 url-safe random chars, same character class as Overture ids
    const bytes = new Uint8Array(15)
    crypto.getRandomValues(bytes)
    const gersId = 'cmty_' + Buffer.from(bytes).toString('base64url')

    const h3r8 = BigInt(`0x${getH3Index(geo.lat, geo.lng, DEFAULT_RESOLUTION)}`).toString()
    const h3r9 = BigInt(`0x${getH3Index(geo.lat, geo.lng, FINE_RESOLUTION)}`).toString()

    // Street part of the geocoded address; fall back to what they typed
    const street = geo.formattedAddress.split(',').slice(0, 2).join(',').trim() || address

    const rows = await sql`
      INSERT INTO restaurants (
        gers_id, name, address, city, state, postal_code, country, lat, lng,
        categories, primary_category, source, h3_index_res8, h3_index_res9
      ) VALUES (
        ${gersId}, ${name}, ${street}, ${geo.city ?? null}, ${geo.state ?? null},
        ${geo.postalCode ?? null}, 'US', ${geo.lat}, ${geo.lng},
        ${['restaurant']}::text[], 'restaurant', 'community',
        ${h3r8}::bigint, ${h3r9}::bigint
      )
      RETURNING gers_id, name, address, city, lat, lng
    `
    const r = rows[0]

    return NextResponse.json(
      {
        restaurant: {
          id: r.gers_id,
          name: r.name,
          address: [r.address, r.city].filter(Boolean).join(', '),
          lat: r.lat,
          lng: r.lng,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API] Adding community place failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
