-- Migration: Nomination Layer
-- Adds user profiles, nominations, restaurant enrichment, favorites, and swipe history
-- Run this AFTER schema.sql

-- ============================================================================
-- USER PROFILES (Linked to Clerk auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  clerk_user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,

  -- Default location (Orlando)
  default_lat DOUBLE PRECISION DEFAULT 28.5383,
  default_lng DOUBLE PRECISION DEFAULT -81.3792,
  default_city TEXT DEFAULT 'Orlando',

  -- Denormalized stats for fast reads
  nomination_count INTEGER DEFAULT 0,
  enrichment_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- NOMINATIONS (Personal endorsements - multiple per restaurant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS nominations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gers_id TEXT NOT NULL REFERENCES restaurants(gers_id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,

  -- Required (quick capture)
  photo_url TEXT NOT NULL,
  why_i_love_it TEXT NOT NULL,

  -- Optional (progressive enrichment)
  my_favorite_dishes TEXT[] DEFAULT '{}',
  good_for TEXT[] DEFAULT '{}',  -- 'date_night', 'family', 'groups', 'solo', 'quick_bite'

  created_at TIMESTAMP DEFAULT NOW(),

  -- One nomination per user per restaurant
  UNIQUE (gers_id, clerk_user_id)
);

-- Indexes for nominations
CREATE INDEX idx_nominations_restaurant ON nominations(gers_id);
CREATE INDEX idx_nominations_user ON nominations(clerk_user_id);
CREATE INDEX idx_nominations_created ON nominations(created_at DESC);

-- ============================================================================
-- RESTAURANT ENRICHMENT (Factual data - one per restaurant, wiki-style)
-- ============================================================================
CREATE TABLE IF NOT EXISTS restaurant_enrichment (
  gers_id TEXT PRIMARY KEY REFERENCES restaurants(gers_id) ON DELETE CASCADE,

  -- Hours info
  hours_notes TEXT,
  hours_updated_at TIMESTAMP,

  -- Menu link
  menu_url TEXT,
  menu_updated_at TIMESTAMP,

  -- Parking info
  parking_notes TEXT,
  parking_updated_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE TRIGGER restaurant_enrichment_updated_at
  BEFORE UPDATE ON restaurant_enrichment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ADD NOMINATION TRACKING TO RESTAURANTS
-- ============================================================================
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS nomination_count INTEGER DEFAULT 0;

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS first_nominated_at TIMESTAMP;

-- Index for finding nominated restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_nomination_count
  ON restaurants(nomination_count DESC)
  WHERE nomination_count > 0;

-- ============================================================================
-- USER FAVORITES
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
  gers_id TEXT NOT NULL REFERENCES restaurants(gers_id) ON DELETE CASCADE,

  -- Where did this favorite come from?
  source TEXT DEFAULT 'discover' CHECK (source IN ('discover', 'group_vote', 'nomination')),

  created_at TIMESTAMP DEFAULT NOW(),

  -- One favorite per user per restaurant
  UNIQUE (clerk_user_id, gers_id)
);

-- Index for user's favorites
CREATE INDEX idx_user_favorites_user ON user_favorites(clerk_user_id);
CREATE INDEX idx_user_favorites_restaurant ON user_favorites(gers_id);

-- ============================================================================
-- SWIPE HISTORY (For personalized recommendations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS swipe_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
  gers_id TEXT NOT NULL REFERENCES restaurants(gers_id) ON DELETE CASCADE,

  action TEXT NOT NULL CHECK (action IN ('like', 'dislike', 'skip')),

  swiped_at TIMESTAMP DEFAULT NOW(),

  -- One swipe per user per restaurant (can be updated)
  UNIQUE (clerk_user_id, gers_id)
);

-- Index for user's swipe history
CREATE INDEX idx_swipe_history_user ON swipe_history(clerk_user_id);
CREATE INDEX idx_swipe_history_user_action ON swipe_history(clerk_user_id, action);

-- ============================================================================
-- FUNCTIONS FOR NOMINATION MANAGEMENT
-- ============================================================================

-- Function to increment nomination count when a nomination is created
CREATE OR REPLACE FUNCTION increment_nomination_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update restaurant nomination count
  UPDATE restaurants
  SET
    nomination_count = nomination_count + 1,
    first_nominated_at = COALESCE(first_nominated_at, NOW())
  WHERE gers_id = NEW.gers_id;

  -- Update user nomination count
  UPDATE user_profiles
  SET nomination_count = nomination_count + 1
  WHERE clerk_user_id = NEW.clerk_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement nomination count when a nomination is deleted
CREATE OR REPLACE FUNCTION decrement_nomination_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update restaurant nomination count
  UPDATE restaurants
  SET nomination_count = GREATEST(nomination_count - 1, 0)
  WHERE gers_id = OLD.gers_id;

  -- Update user nomination count
  UPDATE user_profiles
  SET nomination_count = GREATEST(nomination_count - 1, 0)
  WHERE clerk_user_id = OLD.clerk_user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Triggers for nomination count management
CREATE TRIGGER nomination_created
  AFTER INSERT ON nominations
  FOR EACH ROW
  EXECUTE FUNCTION increment_nomination_count();

CREATE TRIGGER nomination_deleted
  AFTER DELETE ON nominations
  FOR EACH ROW
  EXECUTE FUNCTION decrement_nomination_count();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Restaurants with nomination data
CREATE OR REPLACE VIEW restaurants_with_nominations AS
SELECT
  r.*,
  COALESCE(r.nomination_count, 0) as nom_count,
  e.hours_notes,
  e.menu_url,
  e.parking_notes,
  -- Completeness score (0-100)
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
  ) as completeness_score
FROM restaurants r
LEFT JOIN restaurant_enrichment e ON r.gers_id = e.gers_id;

-- User stats view
CREATE OR REPLACE VIEW user_stats AS
SELECT
  up.clerk_user_id,
  up.display_name,
  up.nomination_count,
  up.enrichment_count,
  (SELECT COUNT(*) FROM user_favorites uf WHERE uf.clerk_user_id = up.clerk_user_id) as favorites_count,
  -- Backers: count of other users who also nominated the same restaurants
  (
    SELECT COUNT(DISTINCT n2.clerk_user_id)
    FROM nominations n1
    JOIN nominations n2 ON n1.gers_id = n2.gers_id AND n1.clerk_user_id != n2.clerk_user_id
    WHERE n1.clerk_user_id = up.clerk_user_id
  ) as backers_count
FROM user_profiles up;
