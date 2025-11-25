import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'

const client = new Client({})

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json()

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey || apiKey === 'your_api_key_here') {
      // Fallback to a default location (NYC) if no API key
      console.warn('Google Maps API key not configured, using default location')
      return NextResponse.json({
        success: true,
        location: { lat: 40.7128, lng: -74.006 },
        formattedAddress: 'New York, NY (default)',
      })
    }

    // Call Google Geocoding API
    try {
      const response = await client.geocode({
        params: {
          address,
          key: apiKey,
        },
      })

      if (response.data.status !== 'OK' || response.data.results.length === 0) {
        console.error('Geocoding error:', response.data.status)
        return NextResponse.json(
          { error: `Location not found: ${response.data.status}` },
          { status: 404 }
        )
      }

      const result = response.data.results[0]
      const location = {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      }

      return NextResponse.json({
        success: true,
        location,
        formattedAddress: result.formatted_address,
      })
    } catch (apiError: any) {
      // Google API error - likely 403 (Geocoding API not enabled) or quota exceeded
      console.error('Google Geocoding API error:', apiError.message)

      // For 403 errors, provide helpful message
      if (apiError.response?.status === 403) {
        console.warn('Geocoding API not enabled or restricted. Please enable the Geocoding API in Google Cloud Console.')
        return NextResponse.json(
          {
            error: 'Geocoding API not enabled. Please use current location or contact support.',
            fallback: true
          },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: 'Unable to geocode address. Please try current location instead.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Error geocoding address:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
