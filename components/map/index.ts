// Only SSR-safe exports here. RestaurantMap/RestaurantMarker import Leaflet,
// which touches `window` at module scope — importing them through this barrel
// would crash prerendering. Use DynamicMap (client-only loader) instead, or
// import the concrete files inside another `ssr: false` dynamic import.
export { DynamicMap } from './DynamicMap'
export { MapToggle } from './MapToggle'
export type { MapToggleProps } from './MapToggle'
export type { RestaurantMapProps } from './RestaurantMap'
export type { MapPlace, RestaurantMarkerProps } from './RestaurantMarker'
