import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isFavorite, removeFavorite } from '@/lib/favorites'

interface RouteParams {
  params: Promise<{ restaurantId: string }>
}

/**
 * GET /api/favorites/[restaurantId]
 * Check if a restaurant is in user's favorites
 */
export async function GET(
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

    const { restaurantId } = await params
    const favorited = await isFavorite(userId, restaurantId)

    return NextResponse.json({ favorited })
  } catch (error) {
    console.error('[API] Error checking favorite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/favorites/[restaurantId]
 * Remove a restaurant from favorites
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

    const { restaurantId } = await params
    const removed = await removeFavorite(userId, restaurantId)

    if (!removed) {
      return NextResponse.json(
        { error: 'Restaurant was not in favorites' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error removing favorite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
