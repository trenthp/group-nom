import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

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

    return NextResponse.json({
      success: true,
      restaurant: {
        id: r.gers_id,
        name: r.name,
        address: [r.address, r.city, r.state].filter(Boolean).join(', '),
        rating: 0,
        reviewCount: 0,
        cuisines: (r.categories ?? [])
          .map((c: string) => c.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()))
          .slice(0, 3),
        imageUrl: r.photo_url ?? undefined,
        lat: r.lat,
        lng: r.lng,
        likeCount: r.like_count,
        nominationCount: r.nomination_count,
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
