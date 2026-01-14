/**
 * GET /api/groups - Get user's groups
 * POST /api/groups - Create a new group
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getGroupsForUser, createGroup } from '@/lib/groups'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const groups = await getGroupsForUser(userId)

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Error fetching groups:', error)
    // Check if it's a database table not found error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Groups feature not yet set up. Database tables need to be created.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
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

    const body = await request.json()

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    const name = body.name.trim().slice(0, 50)
    if (name.length === 0) {
      return NextResponse.json(
        { error: 'Group name cannot be empty' },
        { status: 400 }
      )
    }

    const group = await createGroup(userId, name)

    return NextResponse.json({ group }, { status: 201 })
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    )
  }
}
