import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateNomination, deleteNomination } from '@/lib/nominations'
import type { GoodForTag } from '@/lib/types'

const VALID_GOOD_FOR_TAGS: GoodForTag[] = [
  'date_night', 'family', 'groups', 'solo', 'quick_bite', 'late_night', 'brunch'
]

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/nominations/[id]
 * Update a nomination (progressive enrichment)
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

    const { id } = await params
    const body = await request.json()
    const { myFavoriteDishes, goodFor } = body

    // Validate myFavoriteDishes
    if (myFavoriteDishes !== undefined) {
      if (!Array.isArray(myFavoriteDishes)) {
        return NextResponse.json(
          { error: 'myFavoriteDishes must be an array' },
          { status: 400 }
        )
      }
      if (myFavoriteDishes.some(d => typeof d !== 'string' || d.length > 100)) {
        return NextResponse.json(
          { error: 'Each dish must be a string under 100 characters' },
          { status: 400 }
        )
      }
      if (myFavoriteDishes.length > 10) {
        return NextResponse.json(
          { error: 'Maximum 10 favorite dishes allowed' },
          { status: 400 }
        )
      }
    }

    // Validate goodFor
    if (goodFor !== undefined) {
      if (!Array.isArray(goodFor)) {
        return NextResponse.json(
          { error: 'goodFor must be an array' },
          { status: 400 }
        )
      }
      if (goodFor.some(g => !VALID_GOOD_FOR_TAGS.includes(g))) {
        return NextResponse.json(
          { error: `Invalid goodFor tag. Valid options: ${VALID_GOOD_FOR_TAGS.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const nomination = await updateNomination(id, userId, {
      myFavoriteDishes: myFavoriteDishes?.map((d: string) => d.trim()).filter(Boolean),
      goodFor,
    })

    if (!nomination) {
      return NextResponse.json(
        { error: 'Nomination not found or you do not have permission to update it' },
        { status: 404 }
      )
    }

    return NextResponse.json({ nomination })
  } catch (error) {
    console.error('[API] Error updating nomination:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/nominations/[id]
 * Delete a nomination
 */
export async function DELETE(
  _request: NextRequest,
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

    const { id } = await params
    const deleted = await deleteNomination(id, userId)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Nomination not found or you do not have permission to delete it' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error deleting nomination:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
