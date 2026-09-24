/**
 * POST /api/reports
 *   body: { targetType: 'nomination' | 'restaurant', targetId, reason, note? }
 *
 * Any member can report. One per member per target (a repeat refreshes).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sql } from '@/lib/db'
import { ensureProfile, canPublish } from '@/lib/userProfile'
import { createReport, REPORT_REASONS, type ReportReason } from '@/lib/reports'

const UUID_RE = /^[0-9a-f-]{36}$/i
const GERS_RE = /^[A-Za-z0-9_-]{1,128}$/

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
    const { targetType, targetId } = body
    const reason: ReportReason | undefined = REPORT_REASONS.includes(body.reason) ? body.reason : undefined
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) || null : null

    if (!reason) {
      return NextResponse.json({ error: 'Pick a reason' }, { status: 400 })
    }

    if (targetType === 'nomination') {
      if (typeof targetId !== 'string' || !UUID_RE.test(targetId)) {
        return NextResponse.json({ error: 'Invalid nomination' }, { status: 400 })
      }
      const exists = await sql`SELECT 1 FROM nominations WHERE id = ${targetId}::uuid`
      if (exists.length === 0) return NextResponse.json({ error: 'Nomination not found' }, { status: 404 })
    } else if (targetType === 'restaurant') {
      if (typeof targetId !== 'string' || !GERS_RE.test(targetId)) {
        return NextResponse.json({ error: 'Invalid place' }, { status: 400 })
      }
      const exists = await sql`SELECT 1 FROM restaurants WHERE gers_id = ${targetId}`
      if (exists.length === 0) return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    } else {
      return NextResponse.json({ error: 'Invalid report target' }, { status: 400 })
    }

    const report = await createReport(userId, targetType, targetId, reason, note)
    return NextResponse.json({ report: { id: report.id, status: report.status } }, { status: 201 })
  } catch (error) {
    console.error('[API] Creating report failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
