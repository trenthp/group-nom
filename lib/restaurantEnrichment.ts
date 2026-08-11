/**
 * Restaurant Enrichment
 *
 * Handles factual data that any user can contribute to a restaurant:
 * hours, menu URL, parking notes.
 *
 * This is wiki-style - anyone can update, single source of truth per restaurant.
 */

import { sql } from './db'
import { incrementEnrichmentCount } from './userProfile'
import type { RestaurantEnrichment } from './types'

// ============================================================================
// Database Row Types
// ============================================================================

interface DbRestaurantEnrichment {
  gers_id: string
  hours_notes: string | null
  hours_updated_at: Date | null
  menu_url: string | null
  menu_updated_at: Date | null
  parking_notes: string | null
  parking_updated_at: Date | null
  created_at: Date
  updated_at: Date
}

// ============================================================================
// Serialization
// ============================================================================

function serializeEnrichment(row: DbRestaurantEnrichment): RestaurantEnrichment {
  return {
    gersId: row.gers_id,
    hoursNotes: row.hours_notes ?? undefined,
    hoursUpdatedAt: row.hours_updated_at ?? undefined,
    menuUrl: row.menu_url ?? undefined,
    menuUpdatedAt: row.menu_updated_at ?? undefined,
    parkingNotes: row.parking_notes ?? undefined,
    parkingUpdatedAt: row.parking_updated_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// Enrichment CRUD
// ============================================================================

/**
 * Get enrichment data for a restaurant
 */
export async function getEnrichment(gersId: string): Promise<RestaurantEnrichment | null> {
  const rows = await sql`
    SELECT * FROM restaurant_enrichment WHERE gers_id = ${gersId}
  `

  if (rows.length === 0) {
    return null
  }

  return serializeEnrichment(rows[0] as DbRestaurantEnrichment)
}

/**
 * Update hours notes for a restaurant
 */
export async function updateHoursNotes(
  gersId: string,
  hoursNotes: string,
  clerkUserId: string
): Promise<RestaurantEnrichment> {
  const rows = await sql`
    INSERT INTO restaurant_enrichment (gers_id, hours_notes, hours_updated_at)
    VALUES (${gersId}, ${hoursNotes}, NOW())
    ON CONFLICT (gers_id) DO UPDATE SET
      hours_notes = EXCLUDED.hours_notes,
      hours_updated_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `

  // Increment user's enrichment count
  await incrementEnrichmentCount(clerkUserId)

  return serializeEnrichment(rows[0] as DbRestaurantEnrichment)
}

/**
 * Update menu URL for a restaurant
 */
export async function updateMenuUrl(
  gersId: string,
  menuUrl: string,
  clerkUserId: string
): Promise<RestaurantEnrichment> {
  // Basic URL validation
  try {
    new URL(menuUrl)
  } catch {
    throw new Error('Invalid menu URL')
  }

  const rows = await sql`
    INSERT INTO restaurant_enrichment (gers_id, menu_url, menu_updated_at)
    VALUES (${gersId}, ${menuUrl}, NOW())
    ON CONFLICT (gers_id) DO UPDATE SET
      menu_url = EXCLUDED.menu_url,
      menu_updated_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `

  // Increment user's enrichment count
  await incrementEnrichmentCount(clerkUserId)

  return serializeEnrichment(rows[0] as DbRestaurantEnrichment)
}

/**
 * Update parking notes for a restaurant
 */
export async function updateParkingNotes(
  gersId: string,
  parkingNotes: string,
  clerkUserId: string
): Promise<RestaurantEnrichment> {
  const rows = await sql`
    INSERT INTO restaurant_enrichment (gers_id, parking_notes, parking_updated_at)
    VALUES (${gersId}, ${parkingNotes}, NOW())
    ON CONFLICT (gers_id) DO UPDATE SET
      parking_notes = EXCLUDED.parking_notes,
      parking_updated_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `

  // Increment user's enrichment count
  await incrementEnrichmentCount(clerkUserId)

  return serializeEnrichment(rows[0] as DbRestaurantEnrichment)
}

/**
 * Update multiple enrichment fields at once
 */
export async function updateEnrichment(
  gersId: string,
  updates: {
    hoursNotes?: string
    menuUrl?: string
    parkingNotes?: string
  },
  clerkUserId: string
): Promise<RestaurantEnrichment> {
  // Validate menu URL if provided
  if (updates.menuUrl) {
    try {
      new URL(updates.menuUrl)
    } catch {
      throw new Error('Invalid menu URL')
    }
  }

  // Count how many new fields are being added
  const existingEnrichment = await getEnrichment(gersId)
  let newFieldsCount = 0

  if (updates.hoursNotes && !existingEnrichment?.hoursNotes) newFieldsCount++
  if (updates.menuUrl && !existingEnrichment?.menuUrl) newFieldsCount++
  if (updates.parkingNotes && !existingEnrichment?.parkingNotes) newFieldsCount++

  const rows = await sql`
    INSERT INTO restaurant_enrichment (
      gers_id,
      hours_notes,
      hours_updated_at,
      menu_url,
      menu_updated_at,
      parking_notes,
      parking_updated_at
    )
    VALUES (
      ${gersId},
      ${updates.hoursNotes ?? null},
      ${updates.hoursNotes ? sql`NOW()` : null},
      ${updates.menuUrl ?? null},
      ${updates.menuUrl ? sql`NOW()` : null},
      ${updates.parkingNotes ?? null},
      ${updates.parkingNotes ? sql`NOW()` : null}
    )
    ON CONFLICT (gers_id) DO UPDATE SET
      hours_notes = COALESCE(EXCLUDED.hours_notes, restaurant_enrichment.hours_notes),
      hours_updated_at = CASE WHEN EXCLUDED.hours_notes IS NOT NULL THEN NOW() ELSE restaurant_enrichment.hours_updated_at END,
      menu_url = COALESCE(EXCLUDED.menu_url, restaurant_enrichment.menu_url),
      menu_updated_at = CASE WHEN EXCLUDED.menu_url IS NOT NULL THEN NOW() ELSE restaurant_enrichment.menu_updated_at END,
      parking_notes = COALESCE(EXCLUDED.parking_notes, restaurant_enrichment.parking_notes),
      parking_updated_at = CASE WHEN EXCLUDED.parking_notes IS NOT NULL THEN NOW() ELSE restaurant_enrichment.parking_updated_at END,
      updated_at = NOW()
    RETURNING *
  `

  // Increment user's enrichment count for each new field
  for (let i = 0; i < newFieldsCount; i++) {
    await incrementEnrichmentCount(clerkUserId)
  }

  return serializeEnrichment(rows[0] as DbRestaurantEnrichment)
}

/**
 * Get restaurants that need enrichment (have nominations but missing data)
 */
export async function getRestaurantsNeedingEnrichment(
  limit = 20
): Promise<Array<{ gersId: string; name: string; nominationCount: number; missingFields: string[] }>> {
  const rows = await sql`
    SELECT
      r.gers_id,
      r.name,
      r.nomination_count,
      e.hours_notes,
      e.menu_url,
      e.parking_notes
    FROM restaurants r
    LEFT JOIN restaurant_enrichment e ON r.gers_id = e.gers_id
    WHERE r.nomination_count > 0
      AND (e.gers_id IS NULL OR e.hours_notes IS NULL OR e.menu_url IS NULL OR e.parking_notes IS NULL)
    ORDER BY r.nomination_count DESC
    LIMIT ${limit}
  `

  return rows.map(row => {
    const missingFields: string[] = []
    if (!row.hours_notes) missingFields.push('hours')
    if (!row.menu_url) missingFields.push('menu')
    if (!row.parking_notes) missingFields.push('parking')

    return {
      gersId: row.gers_id,
      name: row.name,
      nominationCount: row.nomination_count,
      missingFields,
    }
  })
}
