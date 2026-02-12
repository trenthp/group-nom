/**
 * POST /api/feedback - Submit user feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { sql } from '@/lib/db'

const feedbackSchema = z.object({
  category: z.enum(['bug', 'feature', 'general']),
  message: z.string().min(1).max(1000),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const parsed = feedbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { category, message } = parsed.data

    await sql`
      INSERT INTO feedback (clerk_user_id, category, message)
      VALUES (${userId}, ${category}, ${message})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    // Debug: check which database/branch we're connected to
    try {
      const dbInfo = await sql`SELECT current_database(), current_schema()`
      const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedback'`
      console.error('DB debug - database:', dbInfo, 'feedback table exists:', tables)
    } catch (debugErr) {
      console.error('DB debug query failed:', debugErr)
    }
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
