import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'
import { getRandomRestaurants } from '@/lib/googleMaps'
import { Restaurant } from '@/lib/types'

const client = new Client({})

export async function POST(request: NextRequest) {
  try {
    const { lat, lng, radius = 5000, limit = 8 } = await request.json()

    // Check if API key is configured
    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey || apiKey === 'your_api_key_here') {
      console.warn('Google Maps API key not configured, using mock data')
      const restaurants = getRandomRestaurants(limit)
      return NextResponse.json({
        success: true,
        restaurants,
        usingMockData: true,
      })
    }

    // Call Google Places API
    const response = await client.placesNearby({
      params: {
        location: { lat, lng },
        radius,
        type: 'restaurant',
        key: apiKey,
      },
    })

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', response.data.status, response.data.error_message)
      const restaurants = getRandomRestaurants(limit)
      return NextResponse.json({
        success: true,
        restaurants,
        usingMockData: true,
      })
    }

    // Transform Google Places results to our Restaurant type
    const restaurants: Restaurant[] = response.data.results
      .slice(0, limit)
      .map((place, index) => {
        // Map price_level (0-4) to our display format
        let priceLevel = '$'
        if (place.price_level === 2) priceLevel = '$$'
        else if (place.price_level === 3) priceLevel = '$$$'
        else if (place.price_level === 4) priceLevel = '$$$$'

        return {
          id: place.place_id || `place-${index}`,
          name: place.name || 'Unknown Restaurant',
          address: place.vicinity || 'Address not available',
          rating: place.rating || 0,
          reviewCount: place.user_ratings_total || 0,
          cuisines: place.types?.filter(t =>
            !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t)
          ).map(t =>
            t.split('_').map(word =>
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
          ) || ['Restaurant'],
          lat: place.geometry?.location.lat || 0,
          lng: place.geometry?.location.lng || 0,
          priceLevel,
          imageUrl: place.photos?.[0]?.photo_reference
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${apiKey}`
            : undefined,
        }
      })

    return NextResponse.json({
      success: true,
      restaurants,
      usingMockData: false,
    })
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    // Fallback to mock data on error
    const restaurants = getRandomRestaurants(8)
    return NextResponse.json({
      success: true,
      restaurants,
      usingMockData: true,
    })
  }
}
