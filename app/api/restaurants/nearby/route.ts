import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'
import { getRandomRestaurants } from '@/lib/googleMaps'
import { Restaurant } from '@/lib/types'

const client = new Client({})

export async function POST(request: NextRequest) {
  try {
    const { lat, lng, radius = 5000, limit = 8, filters } = await request.json()
    const minRating = filters?.minRating || 0
    const openNow = filters?.openNow || false
    const maxReviews = filters?.maxReviews || 0

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

    // Fisher-Yates shuffle algorithm for true randomization
    const fisherYatesShuffle = <T,>(array: T[]): T[] => {
      const shuffled = [...array]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }

    // Fetch multiple pages of results for better variety
    let allResults: any[] = []
    let pageToken: string | undefined = undefined
    const maxPages = 3 // Fetch up to 3 pages (60 restaurants max) for best variety

    for (let page = 0; page < maxPages; page++) {
      const response = await client.placesNearby({
        params: {
          location: { lat, lng },
          radius,
          type: 'restaurant',
          key: apiKey,
          ...(openNow && { opennow: true }),
          ...(pageToken && { pagetoken: pageToken }),
        },
      })

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        if (page === 0) {
          // Only error if first page fails
          console.error('Google Places API error:', response.data.status, response.data.error_message)
          const restaurants = getRandomRestaurants(limit)
          return NextResponse.json({
            success: true,
            restaurants,
            usingMockData: true,
          })
        }
        break // Stop pagination on error
      }

      allResults = [...allResults, ...(response.data.results || [])]
      pageToken = response.data.next_page_token

      // Break if no more pages
      if (!pageToken) break

      // Google requires a short delay between pagination requests
      if (page < maxPages - 1 && pageToken) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Transform Google Places results to our Restaurant type
    let results = allResults

    // Apply filters
    if (minRating > 0) {
      results = results.filter((place) => (place.rating || 0) >= minRating)
    }

    if (maxReviews > 0) {
      results = results.filter((place) => {
        const reviewCount = place.user_ratings_total || 0
        // If maxReviews is 100, we want <= 100 (hidden gems)
        // If maxReviews is 300, we want <= 300 (lesser-known)
        // etc.
        if (maxReviews === 100) return reviewCount <= 100
        if (maxReviews === 300) return reviewCount <= 300
        if (maxReviews === 500) return reviewCount <= 500
        if (maxReviews === 1000) return reviewCount >= 1000
        if (maxReviews === 5000) return reviewCount >= 5000
        return true
      })
    }

    // Use Fisher-Yates shuffle for true randomization
    const shuffled = fisherYatesShuffle(results)

    const restaurants: Restaurant[] = shuffled
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
          cuisines: place.types?.filter((t: string) =>
            !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t)
          ).map((t: string) =>
            t.split('_').map((word: string) =>
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
