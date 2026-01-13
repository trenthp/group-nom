import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ref = searchParams.get('ref')
  const maxwidth = searchParams.get('maxwidth') || '400'

  if (!ref) {
    return NextResponse.json({ error: 'Missing photo reference' }, { status: 400 })
  }

  // Validate ref format (should be alphanumeric with some special chars)
  if (!/^[A-Za-z0-9_-]+$/.test(ref)) {
    return NextResponse.json({ error: 'Invalid photo reference' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${ref}&key=${apiKey}`

    const response = await fetch(googleUrl)

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch photo' }, { status: response.status })
    }

    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error('Error fetching photo:', error)
    return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 500 })
  }
}
