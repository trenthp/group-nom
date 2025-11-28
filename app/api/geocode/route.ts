import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'

const client = new Client({})

// Extract city and state from address components
function extractCityState(addressComponents: any[]): string {
  let city = ''
  let state = ''

  for (const component of addressComponents) {
    if (component.types.includes('locality')) {
      city = component.long_name
    } else if (component.types.includes('sublocality_level_1') && !city) {
      city = component.long_name
    } else if (component.types.includes('administrative_area_level_1')) {
      state = component.short_name
    }
  }

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

    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    // Reverse geocoding (lat/lng → address)
    if (lat !== undefined && lng !== undefined) {
      if (!apiKey || apiKey === 'your_api_key_here') {
        return NextResponse.json({
          success: true,
          formattedAddress: 'Current Location',
        })
      }

      try {
        const response = await client.reverseGeocode({
          params: {
            latlng: { lat, lng },
            key: apiKey,
          },
        })

        if (response.data.status !== 'OK' || response.data.results.length === 0) {
          return NextResponse.json({
            success: true,
            formattedAddress: 'Current Location',
          })
        }

        const result = response.data.results[0]
        const cityState = extractCityState(result.address_components)

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

    if (!apiKey || apiKey === 'your_api_key_here') {
      console.warn('Google Maps API key not configured, using default location')
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

      const response = await client.geocode({
        params: {
          address: searchAddress,
          key: apiKey,
        },
      })

      if (response.data.status !== 'OK' || response.data.results.length === 0) {
        console.error('Geocoding error:', response.data.status)
        return NextResponse.json(
          { error: 'Could not find that location. Try a different city or zip code.' },
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
      console.error('Google Geocoding API error:', apiError.message)

      if (apiError.response?.status === 403) {
        console.warn('Geocoding API not enabled or restricted.')
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
    console.error('Error geocoding:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
