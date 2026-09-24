'use client'

import dynamic from 'next/dynamic'
import { Spinner } from '@/components/ui'
import type { DiscoverMapProps } from './DiscoverMap'

// Leaflet needs window/document — load client-side only
const DiscoverMap = dynamic(
  () => import('./DiscoverMap').then((mod) => mod.DiscoverMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-surface-card">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto" />
          <p className="mt-2 text-white/50 text-sm">Loading the map...</p>
        </div>
      </div>
    ),
  }
)

export function DynamicDiscoverMap(props: DiscoverMapProps) {
  return <DiscoverMap {...props} />
}
