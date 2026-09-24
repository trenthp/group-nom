-- ============================================
-- Migration 011: Moderation floor
-- Reports on nominations and places, and a quiet-hide for places.
-- Positive-only: a hidden place simply stops surfacing - no badge, no
-- announcement. Idempotent.
-- (no semicolons in comments - the migration runner splits on them)
-- ============================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP;

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS hidden_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_restaurants_hidden
  ON restaurants (hidden_at) WHERE hidden_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (reporter_id, target_type, target_id)
);

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_target_type_check;
ALTER TABLE reports ADD CONSTRAINT reports_target_type_check
  CHECK (target_type IN ('nomination', 'restaurant'));

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reason_check;
ALTER TABLE reports ADD CONSTRAINT reports_reason_check
  CHECK (reason IN ('closed', 'not_a_restaurant', 'inappropriate', 'spam', 'other'));

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('open', 'resolved'));

CREATE INDEX IF NOT EXISTS idx_reports_open
  ON reports (created_at DESC) WHERE status = 'open';

-- The view freezes r.* at CREATE time - recreate so hidden_at is visible
DROP VIEW IF EXISTS restaurants_with_nominations;

CREATE VIEW restaurants_with_nominations AS
SELECT
  r.*,
  e.hours_notes,
  e.menu_url,
  e.parking_notes,
  (
    CASE WHEN r.nomination_count > 0 THEN 20 ELSE 0 END +
    CASE WHEN e.hours_notes IS NOT NULL THEN 20 ELSE 0 END +
    CASE WHEN e.menu_url IS NOT NULL THEN 20 ELSE 0 END +
    CASE WHEN e.parking_notes IS NOT NULL THEN 20 ELSE 0 END +
    CASE WHEN EXISTS (
      SELECT 1 FROM nominations n
      WHERE n.gers_id = r.gers_id
      AND array_length(n.my_favorite_dishes, 1) > 0
    ) THEN 20 ELSE 0 END
  ) AS completeness_score
FROM restaurants r
LEFT JOIN restaurant_enrichment e ON r.gers_id = e.gers_id;
