/**
 * GET /api/groups/[id] - Get group details with members
 * PUT /api/groups/[id] - Update group
 * DELETE /api/groups/[id] - Delete group
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getGroupWithMembers,
  updateGroup,
  deleteGroup,
  generateInviteCode,
} from '@/lib/groups'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const group = await getGroupWithMembers(id, userId)

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found or access denied' },
        { status: 404 }
      )
    }

    // Include invite code for owner
    const inviteCode = group.ownerId === userId ? generateInviteCode(group.id) : null

    return NextResponse.json({
      group,
      inviteCode,
    })
  } catch (error) {
    console.error('Error fetching group:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const updates: { name?: string } = {}

    if (typeof body.name === 'string') {
      updates.name = body.name.trim().slice(0, 50)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      )
    }

    const group = await updateGroup(id, userId, updates)

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found or not authorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Error updating group:', error)
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const deleted = await deleteGroup(id, userId)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Group not found or not authorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    )
  }
}
