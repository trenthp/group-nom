import { NextRequest, NextResponse } from 'next/server'
import { getRestaurantById } from '@/lib/restaurantRepository'
import { getRestaurantDetails } from '@/lib/foursquare'

/**
 * GET /api/restaurants/[id]/details
 *
 * Fetch enriched details for a restaurant (rating, tips, hours, etc.)
 * This data is NOT cached per Foursquare ToS (for non-Enterprise customers).
 * Only call this when user explicitly taps "more info".
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Restaurant ID is required' },
        { status: 400 }
      )
    }

    // Get restaurant from our database
    const restaurant = await getRestaurantById(id)

    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // If not linked to Foursquare, return basic info
    if (!restaurant.fsq_place_id) {
      return NextResponse.json({
        success: true,
        details: {
          name: restaurant.name,
          address: [restaurant.address, restaurant.city, restaurant.state]
            .filter(Boolean)
            .join(', '),
          categories: restaurant.categories,
          rating: null,
          tips: [],
          hours: null,
          priceLevel: null,
          attributes: [],
          source: 'local',
        },
      })
    }

    // Fetch fresh details from Foursquare (not cached per ToS)
    const details = await getRestaurantDetails(restaurant.fsq_place_id)

    if (!details) {
      // Foursquare request failed, return what we have
      return NextResponse.json({
        success: true,
        details: {
          name: restaurant.name,
          address: [restaurant.address, restaurant.city, restaurant.state]
            .filter(Boolean)
            .join(', '),
          categories: restaurant.categories,
          rating: restaurant.fsq_rating,
          tips: [],
          hours: null,
          priceLevel: restaurant.fsq_price_level,
          attributes: [],
          source: 'cached',
        },
      })
    }

    return NextResponse.json({
      success: true,
      details: {
        name: restaurant.name,
        address: [restaurant.address, restaurant.city, restaurant.state]
          .filter(Boolean)
          .join(', '),
        categories: restaurant.categories,
        rating: details.rating,
        tips: details.tips,
        hours: details.hours,
        priceLevel: details.priceLevel,
        attributes: details.attributes,
        source: 'foursquare',
      },
    })
  } catch (error) {
    console.error('[API] Error fetching restaurant details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
