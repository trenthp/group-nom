import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserFavorites, addFavorite, getFavoriteCount } from '@/lib/favorites'
import type { FavoriteSource } from '@/lib/types'

const VALID_SOURCES: FavoriteSource[] = ['discover', 'group_vote', 'nomination']

/**
 * GET /api/favorites
 * Get the current user's favorites
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)
    const source = searchParams.get('source') as FavoriteSource | null

    // Validate source if provided
    if (source && !VALID_SOURCES.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Valid options: ${VALID_SOURCES.join(', ')}` },
        { status: 400 }
      )
    }

    const [favorites, totalCount] = await Promise.all([
      getUserFavorites(userId, { limit, source: source ?? undefined }),
      getFavoriteCount(userId),
    ])

    return NextResponse.json({
      favorites,
      totalCount,
    })
  } catch (error) {
    console.error('[API] Error getting favorites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/favorites
 * Add a restaurant to favorites
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { gersId, source = 'discover' } = body

    // Validate inputs
    if (!gersId || typeof gersId !== 'string') {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    if (!VALID_SOURCES.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Valid options: ${VALID_SOURCES.join(', ')}` },
        { status: 400 }
      )
    }

    const favorite = await addFavorite(userId, gersId, source)

    return NextResponse.json({ favorite }, { status: 201 })
  } catch (error) {
    console.error('[API] Error adding favorite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
