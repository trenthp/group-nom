-- ============================================
-- Migration 004: Nomination Layer Support
-- Completes the community nomination layer:
-- count-maintenance triggers, missing columns, and helper views.
-- Idempotent - safe to re-run.
-- ============================================

-- Missing columns
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS first_nominated_at TIMESTAMP;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS enrichment_count INTEGER DEFAULT 0;

-- Indexes for nomination queries
CREATE INDEX IF NOT EXISTS idx_nominations_restaurant ON nominations(gers_id);
CREATE INDEX IF NOT EXISTS idx_nominations_user ON nominations(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_nominations_created ON nominations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_nomination_count
  ON restaurants(nomination_count DESC)
  WHERE nomination_count > 0;

-- ============================================
-- Nomination count maintenance
-- ============================================

CREATE OR REPLACE FUNCTION increment_nomination_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE restaurants
  SET
    nomination_count = COALESCE(nomination_count, 0) + 1,
    first_nominated_at = COALESCE(first_nominated_at, NOW())
  WHERE gers_id = NEW.gers_id;

  UPDATE user_profiles
  SET nomination_count = COALESCE(nomination_count, 0) + 1
  WHERE clerk_user_id = NEW.clerk_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_nomination_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE restaurants
  SET nomination_count = GREATEST(COALESCE(nomination_count, 0) - 1, 0)
  WHERE gers_id = OLD.gers_id;

  UPDATE user_profiles
  SET nomination_count = GREATEST(COALESCE(nomination_count, 0) - 1, 0)
  WHERE clerk_user_id = OLD.clerk_user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nomination_created ON nominations;
CREATE TRIGGER nomination_created
  AFTER INSERT ON nominations
  FOR EACH ROW
  EXECUTE FUNCTION increment_nomination_count();

DROP TRIGGER IF EXISTS nomination_deleted ON nominations;
CREATE TRIGGER nomination_deleted
  AFTER DELETE ON nominations
  FOR EACH ROW
  EXECUTE FUNCTION decrement_nomination_count();

-- ============================================
-- Helper views
-- ============================================

CREATE OR REPLACE VIEW restaurants_with_nominations AS
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

CREATE OR REPLACE VIEW user_stats AS
SELECT
  up.clerk_user_id,
  up.display_name,
  up.nomination_count,
  up.enrichment_count,
  (SELECT COUNT(*) FROM user_favorites uf WHERE uf.clerk_user_id = up.clerk_user_id) AS favorites_count,
  (
    SELECT COUNT(DISTINCT n2.clerk_user_id)
    FROM nominations n1
    JOIN nominations n2 ON n1.gers_id = n2.gers_id AND n1.clerk_user_id != n2.clerk_user_id
    WHERE n1.clerk_user_id = up.clerk_user_id
  ) AS backers_count
FROM user_profiles up;
