/**
 * GET /api/admin/reports — the open queue. Moderators only.
 */

import { NextResponse } from 'next/server'
import { requireModerator } from '@/lib/admin'
import { listOpenReports } from '@/lib/reports'

export async function GET() {
  try {
    const moderator = await requireModerator()
    if (!moderator) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const reports = await listOpenReports()
    return NextResponse.json({ reports })
  } catch (error) {
    console.error('[API] Listing reports failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
