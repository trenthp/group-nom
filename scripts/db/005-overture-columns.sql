-- ============================================
-- Migration 005: Overture Import Support
-- Columns needed by scripts/import-overture.py plus
-- H3 geospatial indexes for own-database discovery.
-- Idempotent - safe to re-run.
-- ============================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS h3_index_res8 BIGINT,
  ADD COLUMN IF NOT EXISTS h3_index_res9 BIGINT,
  ADD COLUMN IF NOT EXISTS primary_category TEXT,
  ADD COLUMN IF NOT EXISTS overture_update_date DATE;

-- H3 cell lookups for "nearby" queries against our own data
CREATE INDEX IF NOT EXISTS idx_restaurants_h3_res8 ON restaurants(h3_index_res8);
CREATE INDEX IF NOT EXISTS idx_restaurants_h3_res9 ON restaurants(h3_index_res9);

-- Category filtering during discovery
CREATE INDEX IF NOT EXISTS idx_restaurants_primary_category ON restaurants(primary_category);
