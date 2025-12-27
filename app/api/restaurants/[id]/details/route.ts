import { NextRequest, NextResponse } from 'next/server'
import { getRestaurantById } from '@/lib/restaurantRepository'

/**
 * GET /api/restaurants/[id]/details
 *
 * Fetch details for a restaurant.
 * Currently returns local data only.
 * TODO: Add external data source for ratings, tips, hours.
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

    // Return local data
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
  } catch (error) {
    console.error('[API] Error fetching restaurant details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
