// Note: RestaurantMap and RestaurantMarker use Leaflet which requires window/document
// Import them via DynamicMap or use dynamic() imports to avoid SSR issues

export { MapToggle } from './MapToggle'
export type { MapToggleProps } from './MapToggle'

// Re-export types only (not implementations that reference Leaflet)
export type { RestaurantMapProps } from './RestaurantMap'
export type { RestaurantMarkerProps } from './RestaurantMarker'

// DynamicMap should be imported directly to avoid SSR issues:
// import { DynamicMap } from '@/components/map/DynamicMap'
