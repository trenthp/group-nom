import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { put } from '@vercel/blob'
import { sql } from '@/lib/db'

// No SVG: it can carry scripts and render inline (stored XSS)
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

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
    const extension = ALLOWED_IMAGE_TYPES[file.type]
    if (!extension) {
      return NextResponse.json(
        { error: 'File must be a JPEG, PNG, WebP, or GIF image' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File must be under 10MB' },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const filename = `nominations/${gersId}/${userId}-${timestamp}.${extension}`

    // Upload to Vercel Blob; random suffix prevents predictable-path overwrites
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    return NextResponse.json({
      url: blob.url,
      filename: blob.pathname,
    })
  } catch (error) {
    console.error('[API] Error uploading photo:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    )
  }
}
