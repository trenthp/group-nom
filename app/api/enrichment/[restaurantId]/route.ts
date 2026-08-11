import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getEnrichment, updateEnrichment } from '@/lib/restaurantEnrichment'

interface RouteParams {
  params: Promise<{ restaurantId: string }>
}

/**
 * GET /api/enrichment/[restaurantId]
 * Get enrichment data for a restaurant (public)
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { restaurantId } = await params

    const enrichment = await getEnrichment(restaurantId)

    return NextResponse.json({ enrichment })
  } catch (error) {
    console.error('[API] Error getting enrichment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/enrichment/[restaurantId]
 * Update enrichment data for a restaurant (requires auth)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { restaurantId } = await params
    const body = await request.json()
    const { hoursNotes, menuUrl, parkingNotes } = body

    // Validate at least one field is provided
    if (!hoursNotes && !menuUrl && !parkingNotes) {
      return NextResponse.json(
        { error: 'At least one field (hoursNotes, menuUrl, or parkingNotes) is required' },
        { status: 400 }
      )
    }

    // Validate hoursNotes
    if (hoursNotes !== undefined) {
      if (typeof hoursNotes !== 'string' || hoursNotes.length > 200) {
        return NextResponse.json(
          { error: 'Hours notes must be a string under 200 characters' },
          { status: 400 }
        )
      }
    }

    // Validate menuUrl
    if (menuUrl !== undefined) {
      if (typeof menuUrl !== 'string') {
        return NextResponse.json(
          { error: 'Menu URL must be a string' },
          { status: 400 }
        )
      }
      try {
        new URL(menuUrl)
      } catch {
        return NextResponse.json(
          { error: 'Invalid menu URL' },
          { status: 400 }
        )
      }
    }

    // Validate parkingNotes
    if (parkingNotes !== undefined) {
      if (typeof parkingNotes !== 'string' || parkingNotes.length > 200) {
        return NextResponse.json(
          { error: 'Parking notes must be a string under 200 characters' },
          { status: 400 }
        )
      }
    }

    const enrichment = await updateEnrichment(
      restaurantId,
      {
        hoursNotes: hoursNotes?.trim() || undefined,
        menuUrl: menuUrl?.trim() || undefined,
        parkingNotes: parkingNotes?.trim() || undefined,
      },
      userId
    )

    return NextResponse.json({ enrichment })
  } catch (error: any) {
    if (error?.message === 'Invalid menu URL') {
      return NextResponse.json(
        { error: 'Invalid menu URL' },
        { status: 400 }
      )
    }

    console.error('[API] Error updating enrichment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
