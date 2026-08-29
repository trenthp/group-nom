/**
 * POST /api/admin/reports/[id]
 *   body: { action: 'dismiss' | 'remove_nomination' | 'hide_place' | 'suspend_member' }
 *
 * Moderators only. Each action resolves the report and every open sibling
 * on the same target. Never edits a member's words — remove or keep.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireModerator } from '@/lib/admin'
import {
  getReport,
  resolveReport,
  hidePlace,
  removeNominationById,
  setMemberStatus,
} from '@/lib/reports'

const ACTIONS = ['dismiss', 'remove_nomination', 'hide_place', 'suspend_member'] as const
type Action = (typeof ACTIONS)[number]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const moderator = await requireModerator()
    if (!moderator) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { id } = await params
    const body = await request.json()
    const action: Action | undefined = ACTIONS.includes(body.action) ? body.action : undefined
    if (!action) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const report = await getReport(id)
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }
    if (report.status === 'resolved') {
      return NextResponse.json({ error: 'Already resolved' }, { status: 409 })
    }

    switch (action) {
      case 'dismiss':
        await resolveReport(id, 'dismissed', moderator)
        break
      case 'remove_nomination':
        if (report.targetType !== 'nomination') {
          return NextResponse.json({ error: 'Not a nomination report' }, { status: 400 })
        }
        await removeNominationById(report.targetId)
        await resolveReport(id, 'nomination_removed', moderator)
        break
      case 'hide_place': {
        const gersId = report.target?.restaurantId
        if (!gersId) {
          return NextResponse.json({ error: 'No place on this report' }, { status: 400 })
        }
        await hidePlace(gersId, report.reason)
        await resolveReport(id, 'place_hidden', moderator)
        break
      }
      case 'suspend_member': {
        const memberId = report.target?.nominatorId
        if (!memberId) {
          return NextResponse.json({ error: 'No member on this report' }, { status: 400 })
        }
        await setMemberStatus(memberId, 'suspended')
        await resolveReport(id, 'member_suspended', moderator)
        break
      }
    }

    return NextResponse.json({ success: true, action })
  } catch (error) {
    console.error('[API] Resolving report failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
