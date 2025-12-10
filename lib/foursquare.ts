/**
 * Foursquare Places API Client for Group Nom
 *
 * Handles lazy-linking of Overture restaurants to Foursquare entities.
 * Caches fsq_place_id and photo_ids (allowed per Foursquare ToS).
 *
 * API Docs: https://docs.foursquare.com/developer/reference/place-search
 */

import { sql } from './db'

const FSQ_API_BASE = 'https://api.foursquare.com/v3'

interface FoursquarePlace {
  fsq_id: string
  name: string
  location: {
    address?: string
    locality?: string
    region?: string
    postcode?: string
    country?: string
  }
  categories: Array<{
    id: number
    name: string
    short_name: string
    icon: { prefix: string; suffix: string }
  }>
  rating?: number
  price?: number
  photos?: Array<{
    id: string
    prefix: string
    suffix: string
  }>
}

interface FoursquareSearchResponse {
  results: FoursquarePlace[]
}

/**
 * Search Foursquare for a place matching the given restaurant
 */
async function searchFoursquare(
  name: string,
  lat: number,
  lng: number
): Promise<FoursquarePlace | null> {
  const apiKey = process.env.FOURSQUARE_API_KEY
  if (!apiKey) {
    console.warn('FOURSQUARE_API_KEY not configured')
    return null
  }

  try {
    const params = new URLSearchParams({
      query: name,
      ll: `${lat},${lng}`,
      radius: '100', // 100 meters - tight radius for matching
      categories: '13000', // Food & Dining category
      limit: '1',
      fields: 'fsq_id,name,location,categories,rating,price,photos',
    })

    const response = await fetch(`${FSQ_API_BASE}/places/search?${params}`, {
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`Foursquare API error: ${response.status}`)
      return null
    }

    const data: FoursquareSearchResponse = await response.json()
    return data.results[0] || null
  } catch (error) {
    console.error('Foursquare search failed:', error)
    return null
  }
}

/**
 * Get place details including photos
 */
async function getPlaceDetails(fsqId: string): Promise<FoursquarePlace | null> {
  const apiKey = process.env.FOURSQUARE_API_KEY
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({
      fields: 'fsq_id,name,location,categories,rating,price,photos',
    })

    const response = await fetch(`${FSQ_API_BASE}/places/${fsqId}?${params}`, {
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
      },
    })

    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error('Foursquare details fetch failed:', error)
    return null
  }
}

/**
 * Build photo URL from Foursquare photo object
 */
export function buildPhotoUrl(prefix: string, suffix: string, size = '400x400'): string {
  return `${prefix}${size}${suffix}`
}

/**
 * Link a restaurant to Foursquare and cache the mapping
 *
 * This is the "lazy linking" - called on first access, then cached forever
 * (fsq_place_id and photo_ids have unlimited caching per Foursquare ToS)
 */
export async function linkToFoursquare(
  gersId: string,
  name: string,
  lat: number,
  lng: number
): Promise<{
  fsqPlaceId: string | null
  photoIds: string[]
  rating: number | null
  priceLevel: number | null
}> {
  // Search for matching place
  const place = await searchFoursquare(name, lat, lng)

  if (!place) {
    // Mark as attempted but not found (avoid repeated lookups)
    await sql`
      UPDATE restaurants
      SET fsq_linked_at = NOW()
      WHERE gers_id = ${gersId}
    `
    return { fsqPlaceId: null, photoIds: [], rating: null, priceLevel: null }
  }

  // Extract photo IDs (can cache indefinitely per ToS)
  const photoIds = place.photos?.map(p => p.id) || []

  // Build full photo data for caching
  const photoData = place.photos?.map(p => `${p.prefix}|${p.suffix}`) || []

  // Update database with cached Foursquare data
  await sql`
    UPDATE restaurants SET
      fsq_place_id = ${place.fsq_id},
      fsq_photo_ids = ${photoData},
      fsq_rating = ${place.rating || null},
      fsq_price_level = ${place.price || null},
      fsq_linked_at = NOW()
    WHERE gers_id = ${gersId}
  `

  return {
    fsqPlaceId: place.fsq_id,
    photoIds: photoData,
    rating: place.rating || null,
    priceLevel: place.price || null,
  }
}

/**
 * Batch link multiple restaurants to Foursquare
 *
 * Used when a session includes restaurants that haven't been linked yet.
 * Processes concurrently with rate limiting.
 */
export async function batchLinkToFoursquare(
  restaurants: Array<{ gersId: string; name: string; lat: number; lng: number }>
): Promise<Map<string, { photoIds: string[]; rating: number | null }>> {
  const results = new Map()

  // Process in batches of 5 to respect rate limits
  const batchSize = 5
  for (let i = 0; i < restaurants.length; i += batchSize) {
    const batch = restaurants.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (r) => {
        const result = await linkToFoursquare(r.gersId, r.name, r.lat, r.lng)
        return { gersId: r.gersId, ...result }
      })
    )

    for (const result of batchResults) {
      results.set(result.gersId, {
        photoIds: result.photoIds,
        rating: result.rating,
      })
    }

    // Small delay between batches
    if (i + batchSize < restaurants.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  return results
}

/**
 * Get a photo URL for a restaurant
 *
 * Uses cached Foursquare photo data, links if not yet linked.
 */
export async function getRestaurantPhotoUrl(
  gersId: string,
  name: string,
  lat: number,
  lng: number,
  cachedPhotoIds?: string[]
): Promise<string | null> {
  // Use cached photo if available
  if (cachedPhotoIds && cachedPhotoIds.length > 0) {
    const [prefix, suffix] = cachedPhotoIds[0].split('|')
    return buildPhotoUrl(prefix, suffix)
  }

  // Otherwise, try to link and get photo
  const result = await linkToFoursquare(gersId, name, lat, lng)
  if (result.photoIds.length > 0) {
    const [prefix, suffix] = result.photoIds[0].split('|')
    return buildPhotoUrl(prefix, suffix)
  }

  return null
}

/**
 * Fetch fresh "more info" data from Foursquare
 *
 * This is NOT cached (per ToS for non-Enterprise customers).
 * Only called when user taps "more info" on a restaurant.
 */
export async function getRestaurantDetails(fsqPlaceId: string): Promise<{
  rating: number | null
  tips: string[]
  hours: string | null
  priceLevel: number | null
  attributes: string[]
} | null> {
  const apiKey = process.env.FOURSQUARE_API_KEY
  if (!apiKey || !fsqPlaceId) return null

  try {
    const params = new URLSearchParams({
      fields: 'rating,tips,hours,price,tastes,features',
    })

    const response = await fetch(`${FSQ_API_BASE}/places/${fsqPlaceId}?${params}`, {
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
      },
    })

    if (!response.ok) return null

    const place = await response.json()

    return {
      rating: place.rating || null,
      tips: place.tips?.map((t: any) => t.text).slice(0, 3) || [],
      hours: place.hours?.display || null,
      priceLevel: place.price || null,
      attributes: [
        ...(place.tastes || []),
        ...(place.features?.map((f: any) => f.name) || []),
      ].slice(0, 5),
    }
  } catch (error) {
    console.error('Failed to fetch restaurant details:', error)
    return null
  }
}
