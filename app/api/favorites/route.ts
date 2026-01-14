/**
 * GET /api/favorites - Get user's favorites
 * DELETE /api/favorites - Remove a favorite
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getFavorites,
  removeFavorite,
  getFavoriteCount,
} from '@/lib/favorites'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      // Return empty results gracefully
      return NextResponse.json({
        favorites: [],
        pagination: {
          limit: 50,
          offset: 0,
          total: 0,
          hasMore: false,
        },
      })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const [favorites, totalCount] = await Promise.all([
      getFavorites(userId, limit, offset),
      getFavoriteCount(userId),
    ])

    return NextResponse.json({
      favorites,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + favorites.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching favorites:', error)
    // Return empty results on error instead of 500
    return NextResponse.json({
      favorites: [],
      pagination: {
        limit: 50,
        offset: 0,
        total: 0,
        hasMore: false,
      },
    })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const localId = searchParams.get('localId')

    if (!localId) {
      return NextResponse.json(
        { error: 'Missing localId parameter' },
        { status: 400 }
      )
    }

    const removed = await removeFavorite(userId, localId)

    if (!removed) {
      return NextResponse.json(
        { error: 'Favorite not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing favorite:', error)
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    )
  }
}
