-- ============================================
-- Group Nom Hybrid Architecture Migration
-- Google Places for discovery, local DB for data ownership
-- ============================================

-- ============================================
-- CORE TABLES
-- ============================================

-- Restaurants (Overture base + Google-sourced)
-- This table stores restaurants that users have interacted with
CREATE TABLE IF NOT EXISTS restaurants (
  gers_id TEXT PRIMARY KEY,           -- Overture ID or 'gpl_' + google_place_id
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  categories TEXT[],
  source TEXT DEFAULT 'overture',     -- 'overture' | 'google'

  -- Community signals
  like_count INTEGER DEFAULT 0,
  nomination_count INTEGER DEFAULT 0,
  group_win_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Google → Local ID mapping (with analytics for scoring)
CREATE TABLE IF NOT EXISTS restaurant_mappings (
  google_place_id TEXT PRIMARY KEY,
  local_id TEXT NOT NULL REFERENCES restaurants(gers_id),
  source TEXT NOT NULL,               -- 'overture' (matched) | 'google' (created)

  -- Analytics for selection algorithm
  times_shown INTEGER DEFAULT 0,
  times_picked INTEGER DEFAULT 0,
  -- pick_rate calculated as: times_picked / times_shown (only when times_shown >= 5)

  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USER TABLES
-- ============================================

-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  like_count INTEGER DEFAULT 0,
  nomination_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User favorites (from swipes)
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  local_id TEXT NOT NULL REFERENCES restaurants(gers_id),
  google_place_id TEXT,               -- Original Google ID for reference
  source TEXT DEFAULT 'swipe',        -- 'swipe' | 'group_vote' | 'nomination'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (clerk_user_id, local_id)
);

-- Nominations (enhanced favorites with context)
CREATE TABLE IF NOT EXISTS nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id TEXT NOT NULL REFERENCES restaurants(gers_id),
  clerk_user_id TEXT NOT NULL,
  photo_url TEXT,
  why_i_love_it TEXT,
  favorite_dishes TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (local_id, clerk_user_id)
);

-- User collections (curated lists)
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_restaurants (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  local_id TEXT REFERENCES restaurants(gers_id),
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (collection_id, local_id)
);

-- ============================================
-- GROUP TABLES
-- ============================================

-- Saved groups (friends lists)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,             -- clerk_user_id of creator
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (group_id, clerk_user_id)
);

-- ============================================
-- ANALYTICS TABLES
-- ============================================

-- Voting outcomes (for pick_rate calculation)
CREATE TABLE IF NOT EXISTS voting_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id TEXT NOT NULL,
  local_id TEXT REFERENCES restaurants(gers_id),
  session_date DATE DEFAULT CURRENT_DATE,
  participant_count INTEGER,
  was_picked BOOLEAN NOT NULL,
  yes_votes INTEGER DEFAULT 0,
  no_votes INTEGER DEFAULT 0,
  city TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chain detection (built over time)
-- Note: location_count tracks how many times we've seen this restaurant name
-- If location_count >= 5, it's considered a chain for filtering purposes
-- The table is pre-seeded with known chain keywords (see scripts/db/seed-chains.sql)
CREATE TABLE IF NOT EXISTS chain_names (
  name TEXT PRIMARY KEY,
  location_count INTEGER DEFAULT 1,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_restaurants_source ON restaurants(source);
CREATE INDEX IF NOT EXISTS idx_restaurants_like_count ON restaurants(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_mappings_local_id ON restaurant_mappings(local_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON user_favorites(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_local ON user_favorites(local_id);
CREATE INDEX IF NOT EXISTS idx_nominations_local ON nominations(local_id);
CREATE INDEX IF NOT EXISTS idx_nominations_user ON nominations(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_voting_outcomes_place ON voting_outcomes(google_place_id);
CREATE INDEX IF NOT EXISTS idx_voting_outcomes_local ON voting_outcomes(local_id);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get pick_rate (returns NULL if < 5 impressions)
CREATE OR REPLACE FUNCTION get_pick_rate(p_times_shown INTEGER, p_times_picked INTEGER)
RETURNS REAL AS $$
BEGIN
  IF p_times_shown >= 5 THEN
    RETURN p_times_picked::REAL / p_times_shown;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to increment times_shown for multiple restaurants
CREATE OR REPLACE FUNCTION increment_times_shown(place_ids TEXT[])
RETURNS VOID AS $$
BEGIN
  UPDATE restaurant_mappings
  SET times_shown = times_shown + 1
  WHERE google_place_id = ANY(place_ids);
END;
$$ LANGUAGE plpgsql;

-- Function to record a voting outcome and update analytics
CREATE OR REPLACE FUNCTION record_voting_outcome(
  p_google_place_id TEXT,
  p_local_id TEXT,
  p_was_picked BOOLEAN,
  p_yes_votes INTEGER,
  p_no_votes INTEGER,
  p_participant_count INTEGER,
  p_city TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert voting outcome record
  INSERT INTO voting_outcomes (
    google_place_id, local_id, was_picked,
    yes_votes, no_votes, participant_count, city
  ) VALUES (
    p_google_place_id, p_local_id, p_was_picked,
    p_yes_votes, p_no_votes, p_participant_count, p_city
  );

  -- Update times_picked if this restaurant won
  IF p_was_picked THEN
    UPDATE restaurant_mappings
    SET times_picked = times_picked + 1
    WHERE google_place_id = p_google_place_id;

    -- Also update group_win_count on the restaurant
    UPDATE restaurants
    SET group_win_count = group_win_count + 1
    WHERE gers_id = p_local_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to increment like_count when user likes a restaurant
CREATE OR REPLACE FUNCTION increment_like_count(p_local_id TEXT, p_clerk_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Increment restaurant like count
  UPDATE restaurants
  SET like_count = like_count + 1,
      updated_at = NOW()
  WHERE gers_id = p_local_id;

  -- Increment user like count
  UPDATE user_profiles
  SET like_count = like_count + 1
  WHERE clerk_user_id = p_clerk_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update chain detection when we see a restaurant
-- Note: This tracks all restaurant names. Chains naturally accumulate higher counts.
-- Pre-seeded chains have location_count = 100 (see scripts/db/seed-chains.sql)
CREATE OR REPLACE FUNCTION update_chain_detection(p_name TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO chain_names (name, location_count, updated_at)
  VALUES (p_name, 1, NOW())
  ON CONFLICT (name) DO UPDATE
  SET location_count = chain_names.location_count + 1,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
