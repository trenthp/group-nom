/**
 * POST /api/favorites/check
 *
 * Check if multiple restaurants are in user's favorites (batch operation).
 * Useful for displaying favorite status on restaurant cards.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getFavoriteStatus } from '@/lib/favorites'

interface CheckRequest {
  localIds: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: CheckRequest = await request.json()

    if (!body.localIds || !Array.isArray(body.localIds)) {
      return NextResponse.json(
        { error: 'Missing localIds array' },
        { status: 400 }
      )
    }

    const favoriteSet = await getFavoriteStatus(userId, body.localIds)

    // Convert Set to object for JSON response
    const favoriteStatus: Record<string, boolean> = {}
    for (const localId of body.localIds) {
      favoriteStatus[localId] = favoriteSet.has(localId)
    }

    return NextResponse.json({ favoriteStatus })
  } catch (error) {
    console.error('Error checking favorites:', error)
    return NextResponse.json(
      { error: 'Failed to check favorites' },
      { status: 500 }
    )
  }
}
