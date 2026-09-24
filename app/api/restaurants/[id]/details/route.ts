import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { isLikelyChain } from '@/lib/chains'

/**
 * GET /api/restaurants/[id]/details
 *
 * Fetch details for a restaurant from our own database.
 * The image comes from the community: most recent nomination photo, if any.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Sign in to browse the library' }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    const rows = await sql`
      SELECT
        r.gers_id,
        r.name,
        r.address,
        r.city,
        r.state,
        r.lat,
        r.lng,
        r.categories,
        r.like_count,
        r.nomination_count,
        (
          SELECT n.photo_url FROM nominations n
          WHERE n.gers_id = r.gers_id
          ORDER BY n.created_at DESC
          LIMIT 1
        ) AS photo_url
      FROM restaurants r
      WHERE r.gers_id = ${id}
    `

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    const r = rows[0]

    // Not gated: the nominate flow needs name/address for any searchable
    // place. The gate lives on the nominations wall (the actual content).

    // Soft-discourage signal for the nominate flow (never blocks)
    const likelyChain = await isLikelyChain(r.name).catch(() => false)

    return NextResponse.json({
      success: true,
      restaurant: {
        id: r.gers_id,
        name: r.name,
        address: [r.address, r.city, r.state].filter(Boolean).join(', '),
        cuisines: (r.categories ?? [])
          .map((c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()))
          .slice(0, 3),
        imageUrl: r.photo_url ?? undefined,
        lat: r.lat,
        lng: r.lng,
        likeCount: r.like_count,
        nominationCount: r.nomination_count,
        likelyChain,
      },
    })
  } catch (error) {
    console.error('[API] Error fetching restaurant details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
