/**
 * POST /api/groups/join - Join a group via invite code
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { joinGroupByCode } from '@/lib/groups'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    if (!body.inviteCode || typeof body.inviteCode !== 'string') {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    const group = await joinGroupByCode(body.inviteCode, userId)

    if (!group) {
      return NextResponse.json(
        { error: 'Invalid invite code or group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Error joining group:', error)
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    )
  }
}
