import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getOrCreateProfile, updateProfile } from '@/lib/userProfile'

/**
 * GET /api/user/profile
 * Get the current user's profile. Creates one if it doesn't exist.
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get Clerk user data for profile creation
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get or create profile
    const profile = await getOrCreateProfile(
      userId,
      user.emailAddresses[0]?.emailAddress ?? '',
      user.firstName ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}` : undefined,
      user.imageUrl
    )

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[API] Error getting profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/profile
 * Update the current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { displayName, defaultLat, defaultLng, defaultCity } = body

    // Validate inputs
    if (defaultLat !== undefined && (typeof defaultLat !== 'number' || defaultLat < -90 || defaultLat > 90)) {
      return NextResponse.json(
        { error: 'Invalid latitude' },
        { status: 400 }
      )
    }
    if (defaultLng !== undefined && (typeof defaultLng !== 'number' || defaultLng < -180 || defaultLng > 180)) {
      return NextResponse.json(
        { error: 'Invalid longitude' },
        { status: 400 }
      )
    }

    const profile = await updateProfile(userId, {
      displayName,
      defaultLat,
      defaultLng,
      defaultCity,
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[API] Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
