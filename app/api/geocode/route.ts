import { NextRequest, NextResponse } from 'next/server'

const LOCATIONIQ_BASE = 'https://us1.locationiq.com/v1'

// Extract city and state from LocationIQ address object
function extractCityState(address: any): string {
  const city = address.city || address.town || address.village || address.county || ''
  const state = address.state || ''

  if (city && state) {
    return `${city}, ${state}`
  } else if (city) {
    return city
  } else if (state) {
    return state
  }
  return 'Unknown Location'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, lat, lng } = body

    const apiKey = process.env.LOCATIONIQ_API_KEY

    // Reverse geocoding (lat/lng → address)
    if (lat !== undefined && lng !== undefined) {
      if (!apiKey) {
        return NextResponse.json({
          success: true,
          formattedAddress: 'Current Location',
        })
      }

      try {
        const url = `${LOCATIONIQ_BASE}/reverse?key=${apiKey}&lat=${lat}&lon=${lng}&format=json`
        const response = await fetch(url)

        if (!response.ok) {
          return NextResponse.json({
            success: true,
            formattedAddress: 'Current Location',
          })
        }

        const data = await response.json()
        const cityState = extractCityState(data.address || {})

        return NextResponse.json({
          success: true,
          formattedAddress: cityState,
        })
      } catch (apiError: any) {
        console.error('Reverse geocoding error:', apiError.message)
        return NextResponse.json({
          success: true,
          formattedAddress: 'Current Location',
        })
      }
    }

    // Forward geocoding (address → lat/lng)
    if (!address) {
      return NextResponse.json(
        { error: 'Address or coordinates required' },
        { status: 400 }
      )
    }

    if (!apiKey) {
      console.warn('LocationIQ API key not configured, using default location')
      return NextResponse.json({
        success: true,
        location: { lat: 40.7128, lng: -74.006 },
        formattedAddress: 'New York, NY (default)',
      })
    }

    try {
      // If it looks like a US zip code, append USA for better results
      const isZipCode = /^\d{5}(-\d{4})?$/.test(address.trim())
      const searchAddress = isZipCode ? `${address.trim()}, USA` : address

      const url = `${LOCATIONIQ_BASE}/search?key=${apiKey}&q=${encodeURIComponent(searchAddress)}&format=json&countrycodes=us&limit=1`
      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          return NextResponse.json(
            { error: 'Could not find that location. Try a different city or zip code.' },
            { status: 404 }
          )
        }
        throw new Error(`LocationIQ API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: 'Could not find that location. Try a different city or zip code.' },
          { status: 404 }
        )
      }

      const result = data[0]
      const location = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      }

      return NextResponse.json({
        success: true,
        location,
        formattedAddress: result.display_name,
      })
    } catch (apiError: any) {
      console.error('LocationIQ Geocoding API error:', apiError.message)

      return NextResponse.json(
        { error: 'Unable to geocode address. Please try current location instead.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Error geocoding:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
