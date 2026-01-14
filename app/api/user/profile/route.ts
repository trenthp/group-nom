/**
 * GET /api/user/profile - Get current user's profile
 * PUT /api/user/profile - Update user's profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import {
  getOrCreateProfile,
  updateProfile,
  getUserStats,
} from '@/lib/userProfile'

export async function GET() {
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
      // Return empty profile gracefully
      return NextResponse.json({
        profile: null,
        stats: { likes: 0, nominations: 0, favorites: 0 },
      })
    }

    // Get Clerk user data for profile sync
    const clerkUser = await currentUser()
    const clerkData = clerkUser
      ? {
          displayName:
            clerkUser.firstName && clerkUser.lastName
              ? `${clerkUser.firstName} ${clerkUser.lastName}`
              : clerkUser.firstName || clerkUser.username || undefined,
          avatarUrl: clerkUser.imageUrl || undefined,
        }
      : undefined

    const [profile, stats] = await Promise.all([
      getOrCreateProfile(userId, clerkData),
      getUserStats(userId),
    ])

    return NextResponse.json({
      profile,
      stats,
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    // Return empty stats on error instead of 500
    return NextResponse.json({
      profile: null,
      stats: { likes: 0, nominations: 0, favorites: 0 },
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate update fields
    const updates: { displayName?: string; avatarUrl?: string } = {}

    if (typeof body.displayName === 'string') {
      updates.displayName = body.displayName.trim().slice(0, 100)
    }

    if (typeof body.avatarUrl === 'string') {
      updates.avatarUrl = body.avatarUrl.trim().slice(0, 500)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      )
    }

    const profile = await updateProfile(userId, updates)

    if (!profile) {
      // Profile doesn't exist, create it first
      const newProfile = await getOrCreateProfile(userId)
      const updatedProfile = await updateProfile(userId, updates)
      return NextResponse.json({ profile: updatedProfile || newProfile })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
