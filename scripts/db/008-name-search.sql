-- ============================================
-- Migration 008: Name search for the nominate flow
-- Trigram index so "find the place you love" is typo-tolerant and fast
-- across the ~96k seeded rows per state. Idempotent.
-- (no semicolons in comments - the migration runner splits on them)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm
  ON restaurants USING gin (name gin_trgm_ops);

-- Bounding-box scoping for search (H3 cells cap at 25km, search wants wider)
CREATE INDEX IF NOT EXISTS idx_restaurants_lat_lng
  ON restaurants (lat, lng);
