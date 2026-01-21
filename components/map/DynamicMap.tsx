'use client'

import dynamic from 'next/dynamic'
import { Spinner } from '@/components/ui'
import type { RestaurantMapProps } from './RestaurantMap'

// Dynamically import the map component with SSR disabled
// Leaflet requires window/document which aren't available during SSR
const RestaurantMap = dynamic(
  () => import('./RestaurantMap').then((mod) => mod.RestaurantMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-card">
        <div className="text-center">
          <Spinner variant="brand" size="lg" />
          <p className="mt-2 text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    ),
  }
)

export function DynamicMap(props: RestaurantMapProps) {
  return <RestaurantMap {...props} />
}
