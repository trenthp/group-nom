-- ============================================
-- Migration 013: Trust-weighted ranking (decided Aug 2026)
--
-- Wherever nominated places rank, the weight is the sum of the trust of
-- the members who nominated them - not a raw count. Trust is INTERNAL
-- ONLY and is never shown to anyone. Inputs, all bounded:
--   nomination history  up to +1.0   (how many places they have loved)
--   agreement           up to +0.5   (share of their places others also love)
--   interaction         up to +0.7   (enrichments, recent activity)
--   followers           up to +0.5   (internal count, never displayed)
-- Base 1.0, so a brand-new member's nomination counts as one full vote.
-- Suspended members contribute 0. Deleted members keep their last score
-- (their nominations stay, decided Aug 27).
-- (no semicolons in comments - the migration runner splits on them)
-- ============================================

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS love_score REAL NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_restaurants_love_score
  ON restaurants (love_score DESC) WHERE love_score > 0;

-- ---------- member trust ----------
CREATE OR REPLACE FUNCTION compute_trust_score(p_clerk_user_id TEXT)
RETURNS REAL AS $$
DECLARE
  v_status TEXT;
  v_noms INTEGER;
  v_agreed INTEGER;
  v_enrich INTEGER;
  v_active_recent BOOLEAN;
  v_followers INTEGER;
  v_score REAL;
BEGIN
  SELECT status, COALESCE(nomination_count, 0), COALESCE(enrichment_count, 0),
         COALESCE(last_active_at > NOW() - INTERVAL '30 days', FALSE)
    INTO v_status, v_noms, v_enrich, v_active_recent
  FROM user_profiles WHERE clerk_user_id = p_clerk_user_id;

  IF v_status IS NULL THEN RETURN 1.0; END IF;
  IF v_status = 'suspended' THEN RETURN 0.0; END IF;

  SELECT COUNT(*) INTO v_agreed
  FROM nominations n1
  WHERE n1.clerk_user_id = p_clerk_user_id
    AND EXISTS (SELECT 1 FROM nominations n2 WHERE n2.gers_id = n1.gers_id AND n2.clerk_user_id <> n1.clerk_user_id);

  SELECT COUNT(*) INTO v_followers FROM follows WHERE followee_id = p_clerk_user_id;

  v_score := 1.0
    + LEAST(v_noms, 10) * 0.10
    + CASE WHEN v_noms > 0 THEN (v_agreed::REAL / v_noms) * 0.5 ELSE 0 END
    + LEAST(v_enrich, 10) * 0.05
    + CASE WHEN v_active_recent THEN 0.2 ELSE 0 END
    + LEAST(v_followers, 20) * 0.025;

  RETURN LEAST(GREATEST(v_score, 0.0), 3.0);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION recompute_trust_score(p_clerk_user_id TEXT)
RETURNS REAL AS $$
DECLARE v_score REAL;
BEGIN
  v_score := compute_trust_score(p_clerk_user_id);
  UPDATE user_profiles
  SET trust_score = v_score, trust_updated_at = NOW()
  WHERE clerk_user_id = p_clerk_user_id;
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ---------- place love ----------
CREATE OR REPLACE FUNCTION recompute_love_score(p_gers_id TEXT)
RETURNS REAL AS $$
DECLARE v_love REAL;
BEGIN
  SELECT COALESCE(SUM(COALESCE(up.trust_score, 1.0)), 0)
    INTO v_love
  FROM nominations n
  LEFT JOIN user_profiles up ON up.clerk_user_id = n.clerk_user_id
  WHERE n.gers_id = p_gers_id;

  UPDATE restaurants SET love_score = v_love WHERE gers_id = p_gers_id;
  RETURN v_love;
END;
$$ LANGUAGE plpgsql;

-- Hook love into the existing count triggers (004) so it can never drift
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

  PERFORM recompute_love_score(NEW.gers_id);
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

  PERFORM recompute_love_score(OLD.gers_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- When a member's trust changes, every place they love is re-weighted
CREATE OR REPLACE FUNCTION propagate_trust_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trust_score IS DISTINCT FROM OLD.trust_score THEN
    PERFORM recompute_love_score(n.gers_id)
    FROM (SELECT DISTINCT gers_id FROM nominations WHERE clerk_user_id = NEW.clerk_user_id) n;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trust_changed ON user_profiles;
CREATE TRIGGER trust_changed
  AFTER UPDATE OF trust_score ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION propagate_trust_change();

-- Backfill: every member with a nomination, then every loved place
SELECT recompute_trust_score(clerk_user_id) FROM user_profiles WHERE nomination_count > 0;
SELECT recompute_love_score(gers_id) FROM restaurants WHERE nomination_count > 0;

-- The view freezes r.* - recreate so love_score is visible
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
