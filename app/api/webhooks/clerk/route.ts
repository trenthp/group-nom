/**
 * POST /api/webhooks/clerk
 *
 * Keeps user_profiles in step with Clerk so a profile row always exists and
 * attribution never goes stale:
 *   user.created  → create the row, seed name/avatar
 *   user.updated  → overwrite name/avatar
 *   user.deleted  → anonymize (nominations stay as "a former member")
 *
 * Verified with the Svix signature via CLERK_WEBHOOK_SIGNING_SECRET. The
 * endpoint is exempt from Clerk auth and rate limiting in middleware.ts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { syncProfileFromClerk, anonymizeProfile } from '@/lib/userProfile'

function displayNameFrom(data: {
  first_name?: string | null
  last_name?: string | null
  username?: string | null
}): string | undefined {
  if (data.first_name && data.last_name) return `${data.first_name} ${data.last_name}`
  return data.first_name || data.username || undefined
}

export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    console.error('[Webhook] CLERK_WEBHOOK_SIGNING_SECRET is not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  let event
  try {
    event = await verifyWebhook(request)
  } catch (error) {
    console.error('[Webhook] Clerk signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'user.created':
      case 'user.updated': {
        await syncProfileFromClerk(event.data.id, {
          displayName: displayNameFrom(event.data),
          avatarUrl: event.data.image_url || undefined,
        })
        break
      }
      case 'user.deleted': {
        if (event.data.id) {
          await anonymizeProfile(event.data.id)
        }
        break
      }
      default:
        // Other event types are not subscribed; acknowledge so Svix stops retrying
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`[Webhook] Failed handling ${event.type}:`, error)
    // 500 makes Svix retry with backoff, which is what we want for DB hiccups
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}
