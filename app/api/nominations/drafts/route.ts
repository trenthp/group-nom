/**
 * GET  /api/nominations/drafts        → the member's private drafts
 * POST /api/nominations/drafts        → create/update a draft for a place
 *   body: { gersId, whyILoveIt?, myFavoriteDishes?, reason? }
 *
 * Drafts never carry a photo (Blob URLs are public-if-known).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { ensureProfile, canPublish } from '@/lib/userProfile'
import { listDrafts, upsertDraft, type DraftReason } from '@/lib/drafts'

const REASONS: DraftReason[] = ['revisit', 'later', 'limit']
const GERS_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const drafts = await listDrafts(userId)
    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('[API] Listing drafts failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await ensureProfile(userId)
    if (!canPublish(profile)) {
      return NextResponse.json({ error: 'Your account is read-only right now' }, { status: 403 })
    }

    const body = await request.json()
    const { gersId } = body
    if (typeof gersId !== 'string' || !GERS_ID_PATTERN.test(gersId)) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 })
    }

    let whyILoveIt: string | null | undefined
    if (body.whyILoveIt !== undefined) {
      if (typeof body.whyILoveIt !== 'string' || body.whyILoveIt.length > 500) {
        return NextResponse.json({ error: 'Notes must be under 500 characters' }, { status: 400 })
      }
      whyILoveIt = body.whyILoveIt.trim() || null
    }

    let myFavoriteDishes: string[] | undefined
    if (body.myFavoriteDishes !== undefined) {
      if (!Array.isArray(body.myFavoriteDishes) || body.myFavoriteDishes.some((d: unknown) => typeof d !== 'string')) {
        return NextResponse.json({ error: 'Dishes must be a list of names' }, { status: 400 })
      }
      myFavoriteDishes = body.myFavoriteDishes.map((d: string) => d.trim().slice(0, 80)).filter(Boolean).slice(0, 10)
    }

    const reason: DraftReason = REASONS.includes(body.reason) ? body.reason : 'later'

    const exists = await sql`SELECT 1 FROM restaurants WHERE gers_id = ${gersId}`
    if (exists.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const draft = await upsertDraft(userId, gersId, { whyILoveIt, myFavoriteDishes, reason })
    return NextResponse.json({ draft }, { status: 201 })
  } catch (error) {
    console.error('[API] Saving draft failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
