/**
 * H3 Geospatial Utilities for Group Nom
 *
 * H3 is Uber's hierarchical hexagonal geospatial indexing system.
 * It allows for fast "nearby" queries using integer comparisons
 * instead of expensive distance calculations.
 *
 * Resolution guide:
 * - Res 8: ~0.74 km² hexagons (~460m edge) - good for city-level queries
 * - Res 9: ~0.10 km² hexagons (~174m edge) - good for neighborhood-level
 *
 * We use res 8 for initial filtering, res 9 for fine-grained if needed.
 */

import * as h3 from 'h3-js'

// Default resolution for queries (covers ~0.74 km²)
export const DEFAULT_RESOLUTION = 8

// Finer resolution for dense urban areas
export const FINE_RESOLUTION = 9

/**
 * Get the H3 index for a coordinate
 */
export function getH3Index(lat: number, lng: number, resolution = DEFAULT_RESOLUTION): string {
  return h3.latLngToCell(lat, lng, resolution)
}

/**
 * Get H3 indexes for a location and its neighbors (k-ring)
 * This gives you the center hex plus surrounding hexes
 *
 * k=0: just center (1 hex)
 * k=1: center + immediate neighbors (7 hexes)
 * k=2: center + 2 rings of neighbors (19 hexes)
 */
export function getH3Neighborhood(
  lat: number,
  lng: number,
  k: number = 1,
  resolution = DEFAULT_RESOLUTION
): string[] {
  const centerIndex = h3.latLngToCell(lat, lng, resolution)
  return h3.gridDisk(centerIndex, k)
}

/**
 * Calculate approximate radius in km that a k-ring covers
 */
export function kRingRadiusKm(k: number, resolution = DEFAULT_RESOLUTION): number {
  // Edge length in km at different resolutions
  const edgeLengthKm: Record<number, number> = {
    7: 1.22,   // ~1.2km edge
    8: 0.46,   // ~460m edge
    9: 0.17,   // ~170m edge
    10: 0.065, // ~65m edge
  }

  const edge = edgeLengthKm[resolution] || 0.46
  // Approximate: k-ring radius is roughly k * 2 * edge length
  return k * 2 * edge
}

/**
 * Determine the appropriate k value for a desired radius in km
 */
export function radiusToK(radiusKm: number, resolution = DEFAULT_RESOLUTION): number {
  const edgeLengthKm: Record<number, number> = {
    7: 1.22,
    8: 0.46,
    9: 0.17,
    10: 0.065,
  }

  const edge = edgeLengthKm[resolution] || 0.46

  // k ≈ radius / (2 * edge)
  // Add 1 to ensure we cover the full radius
  return Math.ceil(radiusKm / (2 * edge)) + 1
}

/**
 * Convert distance filter (in km) to H3 query parameters
 */
export function distanceToH3Query(
  lat: number,
  lng: number,
  distanceKm: number
): { indexes: string[]; resolution: number } {
  // For small distances, use finer resolution
  const resolution = distanceKm <= 2 ? FINE_RESOLUTION : DEFAULT_RESOLUTION

  const k = radiusToK(distanceKm, resolution)
  const indexes = getH3Neighborhood(lat, lng, k, resolution)

  return { indexes, resolution }
}

/**
 * Check if a point is within a certain distance of another point
 * using H3 (approximate, but very fast)
 */
export function isNearby(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusKm: number
): boolean {
  const { indexes } = distanceToH3Query(lat1, lng1, radiusKm)
  const targetIndex = getH3Index(lat2, lng2, indexes.length > 7 ? FINE_RESOLUTION : DEFAULT_RESOLUTION)
  return indexes.includes(targetIndex)
}

/**
 * Calculate actual distance between two points using Haversine formula
 * Use this for precise distance when needed (after H3 filtering)
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Get the center coordinates of an H3 cell
 */
export function getH3Center(h3Index: string): { lat: number; lng: number } {
  const [lat, lng] = h3.cellToLatLng(h3Index)
  return { lat, lng }
}
