/**
 * POST   /api/members/[id]/block → block (severs follows both ways)
 * DELETE /api/members/[id]/block → unblock
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ensureProfile, getProfileById } from '@/lib/userProfile'
import { block, unblock } from '@/lib/follows'

interface RouteParams { params: Promise<{ id: string }> }

async function resolve(_request: NextRequest, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  await ensureProfile(userId)
  const { id } = await params
  const target = await getProfileById(id)
  if (!target || target.clerkUserId === userId) return { error: NextResponse.json({ error: 'Member not found' }, { status: 404 }) }
  return { userId, target }
}

export async function POST(request: NextRequest, ctx: RouteParams) {
  try {
    const r = await resolve(request, ctx)
    if ('error' in r) return r.error
    await block(r.userId, r.target.clerkUserId)
    return NextResponse.json({ blocked: true })
  } catch (error) {
    console.error('[API] Block failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: RouteParams) {
  try {
    const r = await resolve(request, ctx)
    if ('error' in r) return r.error
    await unblock(r.userId, r.target.clerkUserId)
    return NextResponse.json({ blocked: false })
  } catch (error) {
    console.error('[API] Unblock failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
