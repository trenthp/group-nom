/**
 * DELETE /api/groups/[id]/members?userId=xxx - Remove a member from group
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { removeMember } from '@/lib/groups'

export async function DELETE(
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
    const { searchParams } = new URL(request.url)
    const memberUserId = searchParams.get('userId')

    if (!memberUserId) {
      return NextResponse.json(
        { error: 'Member userId is required' },
        { status: 400 }
      )
    }

    const removed = await removeMember(id, userId, memberUserId)

    if (!removed) {
      return NextResponse.json(
        { error: 'Could not remove member. You may not be the group owner or the member does not exist.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
