'use client'

import dynamic from 'next/dynamic'
import { Spinner } from '@/components/ui'
import type { RestaurantMapProps } from './RestaurantMap'

// Leaflet needs window/document — load the map client-side only
const RestaurantMap = dynamic(
  () => import('./RestaurantMap').then((mod) => mod.RestaurantMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-surface-card rounded-card">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto" />
          <p className="mt-2 text-white/50 text-sm">Loading map...</p>
        </div>
      </div>
    ),
  }
)

export function DynamicMap(props: RestaurantMapProps) {
  return <RestaurantMap {...props} />
}
