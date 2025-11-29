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
    const priceLevel = filters?.priceLevel || [] // [1, 2, 3, 4] for $, $$, $$$, $$$$
    const cuisines = filters?.cuisines || [] // ['Italian', 'Mexican', etc.]

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

    // Fetch restaurants - if cuisines selected, make separate calls per cuisine for better results
    let allResults: any[] = []
    const seenPlaceIds = new Set<string>()

    // Helper to fetch results for a keyword
    const fetchForKeyword = async (keyword?: string) => {
      let pageToken: string | undefined = undefined
      const maxPages = cuisines.length > 1 ? 1 : 3 // Fewer pages per cuisine when multiple selected
      const results: any[] = []

      for (let page = 0; page < maxPages; page++) {
        const response = await client.placesNearby({
          params: {
            location: { lat, lng },
            radius,
            type: 'restaurant',
            key: apiKey,
            ...(openNow && { opennow: true }),
            ...(pageToken && { pagetoken: pageToken }),
            ...(keyword && { keyword }),
          },
        })

        if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
          break
        }

        results.push(...(response.data.results || []))
        pageToken = response.data.next_page_token

        if (!pageToken) break

        if (page < maxPages - 1 && pageToken) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      return results
    }

    if (cuisines.length > 0) {
      // Make separate API calls for each cuisine to ensure we get results for each
      for (const cuisine of cuisines) {
        const results = await fetchForKeyword(cuisine)
        // Deduplicate by place_id
        for (const place of results) {
          if (place.place_id && !seenPlaceIds.has(place.place_id)) {
            seenPlaceIds.add(place.place_id)
            allResults.push(place)
          }
        }
      }
    } else {
      // No cuisine filter - fetch normally with pagination
      allResults = await fetchForKeyword(undefined)
    }

    // Handle case where first call fails completely
    if (allResults.length === 0 && cuisines.length === 0) {
      const restaurants = getRandomRestaurants(limit)
      return NextResponse.json({
        success: true,
        restaurants,
        usingMockData: true,
      })
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

    // Filter by price level
    if (priceLevel.length > 0) {
      results = results.filter((place) => {
        // Google's price_level: 0=free, 1=$, 2=$$, 3=$$$, 4=$$$$
        // Our priceLevel: [1, 2, 3, 4] maps to $, $$, $$$, $$$$
        const placePriceLevel = place.price_level || 1 // Default to $ if not specified
        return priceLevel.includes(placePriceLevel)
      })
    }

    // Note: Cuisine filtering is now done at the API level (separate calls per cuisine)
    // so we don't need to filter locally anymore

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
