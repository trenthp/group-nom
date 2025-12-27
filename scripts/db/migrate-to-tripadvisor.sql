-- Migration: Replace Foursquare with TripAdvisor
-- Run this on existing databases to:
-- 1. Add TripAdvisor columns
-- 2. Drop Foursquare columns and indexes

-- ============================================================================
-- STEP 1: Add TripAdvisor columns
-- ============================================================================
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS ta_location_id TEXT,
  ADD COLUMN IF NOT EXISTS ta_photo_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ta_price_level TEXT,
  ADD COLUMN IF NOT EXISTS ta_linked_at TIMESTAMP;

-- Add index for unlinked TripAdvisor restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_ta_unlinked ON restaurants(gers_id)
  WHERE ta_location_id IS NULL;

-- ============================================================================
-- STEP 2: Drop Foursquare indexes
-- ============================================================================
DROP INDEX IF EXISTS idx_restaurants_fsq_unlinked;

-- ============================================================================
-- STEP 3: Drop Foursquare columns
-- ============================================================================
ALTER TABLE restaurants
  DROP COLUMN IF EXISTS fsq_place_id,
  DROP COLUMN IF EXISTS fsq_photo_ids,
  DROP COLUMN IF EXISTS fsq_rating,
  DROP COLUMN IF EXISTS fsq_price_level,
  DROP COLUMN IF EXISTS fsq_linked_at;

-- ============================================================================
-- STEP 4: Drop Foursquare view
-- ============================================================================
DROP VIEW IF EXISTS restaurants_needing_fsq_link;

-- ============================================================================
-- STEP 5: Create TripAdvisor view
-- ============================================================================
CREATE OR REPLACE VIEW restaurants_needing_ta_link AS
SELECT gers_id, name, lat, lng, city, state
FROM restaurants
WHERE ta_location_id IS NULL
ORDER BY times_shown DESC;

-- ============================================================================
-- STEP 6: Reclaim space
-- ============================================================================
-- Run this separately if needed (locks table):
-- VACUUM FULL restaurants;
