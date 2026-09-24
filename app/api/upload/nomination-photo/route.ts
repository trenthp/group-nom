import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { put } from '@vercel/blob'
import { sql } from '@/lib/db'
import { getProfile } from '@/lib/userProfile'
import { getDailyStatus, resolveTimeZone, limitMessage } from '@/lib/dailyLimit'
import { normalizePhoto, PHOTO_CONTENT_TYPE } from '@/lib/photos'

// No SVG: it can carry scripts and render inline (stored XSS). Whatever
// comes in, what we store is always a metadata-free WebP (see lib/photos).
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

// The client pre-shrinks to well under this (lib/shrinkImage); Vercel
// refuses request bodies over 4.5MB anyway, so this is the ceiling for
// browsers that couldn't shrink.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const GERS_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

/**
 * POST /api/upload/nomination-photo
 * Upload a photo for a nomination
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const gersId = formData.get('gersId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!gersId || !GERS_ID_PATTERN.test(gersId)) {
      return NextResponse.json(
        { error: 'Invalid restaurant ID' },
        { status: 400 }
      )
    }

    // Don't accept a photo the nomination endpoint is about to refuse —
    // Blob URLs are public-if-known, so an orphaned upload is a leak.
    const profile = await getProfile(userId)
    const tz = resolveTimeZone(formData.get('timezone'), profile?.timezone)
    const daily = await getDailyStatus(userId, tz)
    if (daily.usedToday) {
      return NextResponse.json(
        { error: limitMessage(daily), code: 'DAILY_LIMIT', resetsAt: daily.resetsAt },
        { status: 429 }
      )
    }

    // Only upload photos for restaurants that actually exist
    const restaurant = await sql`
      SELECT 1 FROM restaurants WHERE gers_id = ${gersId}
    `
    if (restaurant.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // Validate file type against an explicit allowlist
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'File must be a JPEG, PNG, WebP, or GIF image' },
        { status: 400 }
      )
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'File must be under 10MB' },
        { status: 400 }
      )
    }

    // Normalize: orient, cap at 1600px, WebP, strip EXIF/GPS. The declared
    // MIME type is client-supplied, so decoding is also the real validation.
    let photo
    try {
      photo = await normalizePhoto(await file.arrayBuffer())
    } catch {
      return NextResponse.json(
        { error: 'That file is not an image we can read' },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const filename = `nominations/${gersId}/${userId}-${timestamp}.webp`

    // Upload to Vercel Blob; random suffix prevents predictable-path overwrites
    const blob = await put(filename, photo.buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: PHOTO_CONTENT_TYPE,
    })

    return NextResponse.json({
      url: blob.url,
      filename: blob.pathname,
      width: photo.width,
      height: photo.height,
    })
  } catch (error) {
    console.error('[API] Error uploading photo:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    )
  }
}
