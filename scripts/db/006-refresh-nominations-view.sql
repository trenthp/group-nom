-- ============================================
-- Migration 006: Refresh restaurants_with_nominations view
-- The view was created before migration 005 added the H3 columns;
-- Postgres expands r.* at CREATE time, so it must be dropped and
-- recreated to pick them up. Idempotent.
-- ============================================

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
