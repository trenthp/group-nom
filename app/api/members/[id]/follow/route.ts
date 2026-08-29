/**
 * POST   /api/members/[id]/follow → follow
 * DELETE /api/members/[id]/follow → unfollow
 *
 * [id] is the opaque profile UUID. No counts are returned — ever.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ensureProfile, canPublish, getProfileById } from '@/lib/userProfile'
import { follow, unfollow } from '@/lib/follows'

interface RouteParams { params: Promise<{ id: string }> }

async function resolve(_request: NextRequest, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const viewer = await ensureProfile(userId)
  if (!canPublish(viewer)) return { error: NextResponse.json({ error: 'Your account is read-only right now' }, { status: 403 }) }
  const { id } = await params
  const target = await getProfileById(id)
  if (!target || target.clerkUserId === userId) return { error: NextResponse.json({ error: 'Member not found' }, { status: 404 }) }
  return { userId, target }
}

export async function POST(request: NextRequest, ctx: RouteParams) {
  try {
    const r = await resolve(request, ctx)
    if ('error' in r) return r.error
    const ok = await follow(r.userId, r.target.clerkUserId)
    if (!ok) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    return NextResponse.json({ following: true })
  } catch (error) {
    console.error('[API] Follow failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: RouteParams) {
  try {
    const r = await resolve(request, ctx)
    if ('error' in r) return r.error
    await unfollow(r.userId, r.target.clerkUserId)
    return NextResponse.json({ following: false })
  } catch (error) {
    console.error('[API] Unfollow failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
