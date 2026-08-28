/**
 * GET    /api/nominations/drafts/[gersId] → the member's draft for a place (or null)
 * DELETE /api/nominations/drafts/[gersId] → discard it
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getDraft, deleteDraft } from '@/lib/drafts'

interface RouteParams {
  params: Promise<{ gersId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { gersId } = await params
    const draft = await getDraft(userId, gersId)
    return NextResponse.json({ draft })
  } catch (error) {
    console.error('[API] Reading draft failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { gersId } = await params
    const removed = await deleteDraft(userId, gersId)
    if (!removed) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Deleting draft failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
