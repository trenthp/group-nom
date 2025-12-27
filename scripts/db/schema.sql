-- Group Nom Database Schema
-- Target: Neon (Serverless Postgres)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- ============================================================================
-- RESTAURANTS TABLE (Core entity from Overture Maps)
-- ============================================================================
CREATE TABLE restaurants (
  -- Primary identifier from Overture Maps (stable across updates)
  gers_id TEXT PRIMARY KEY,

  -- Basic info from Overture
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',

  -- Location
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  h3_index_res8 BIGINT,  -- Resolution 8: ~0.74 km² hexagons
  h3_index_res9 BIGINT,  -- Resolution 9: ~0.10 km² hexagons (finer)

  -- Categories from Overture (normalized)
  categories TEXT[] DEFAULT '{}',
  primary_category TEXT,

  -- TripAdvisor linking (populated lazily on first query)
  ta_location_id TEXT,
  ta_photo_urls TEXT[] DEFAULT '{}',  -- Direct URLs to photos (large size)
  ta_price_level TEXT,  -- e.g., "$", "$$", "$$$", "$$$$"
  ta_linked_at TIMESTAMP,

  -- Proprietary analytics (YOUR competitive moat)
  times_shown INTEGER DEFAULT 0,
  times_picked INTEGER DEFAULT 0,
  pick_rate REAL GENERATED ALWAYS AS (
    CASE WHEN times_shown >= 5
         THEN times_picked::REAL / times_shown
         ELSE NULL END  -- Only show rate after 5 impressions
  ) STORED,

  -- Metadata
  overture_update_date DATE,  -- Which Overture release this came from
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Spatial queries: "Find restaurants near this location"
CREATE INDEX idx_restaurants_h3_res8 ON restaurants(h3_index_res8);
CREATE INDEX idx_restaurants_h3_res9 ON restaurants(h3_index_res9);

-- Category filtering
CREATE INDEX idx_restaurants_categories ON restaurants USING GIN(categories);
CREATE INDEX idx_restaurants_primary_category ON restaurants(primary_category);

-- TripAdvisor linking status
CREATE INDEX idx_restaurants_ta_unlinked ON restaurants(gers_id)
  WHERE ta_location_id IS NULL;

-- Location-based sorting (for distance calculations when needed)
CREATE INDEX idx_restaurants_location ON restaurants(lat, lng);

-- Text search on name
CREATE INDEX idx_restaurants_name_trgm ON restaurants
  USING GIN(name gin_trgm_ops);

-- Analytics queries
CREATE INDEX idx_restaurants_pick_rate ON restaurants(pick_rate DESC NULLS LAST)
  WHERE times_shown >= 5;

-- ============================================================================
-- VOTING OUTCOMES (Anonymized aggregate data)
-- ============================================================================
CREATE TABLE voting_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to restaurant
  gers_id TEXT NOT NULL REFERENCES restaurants(gers_id),

  -- Session info (anonymized - no user IDs)
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  participant_count INTEGER NOT NULL,

  -- Outcome
  was_picked BOOLEAN NOT NULL,  -- Was this the winning restaurant?
  yes_votes INTEGER NOT NULL,
  no_votes INTEGER NOT NULL,

  -- Context (for future ML/analysis)
  city TEXT,
  day_of_week INTEGER,  -- 0=Sunday, 6=Saturday

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_voting_outcomes_gers ON voting_outcomes(gers_id);
CREATE INDEX idx_voting_outcomes_date ON voting_outcomes(session_date);
CREATE INDEX idx_voting_outcomes_picked ON voting_outcomes(was_picked, gers_id);

-- ============================================================================
-- CATEGORY MAPPINGS (Normalize Overture categories to your UI categories)
-- ============================================================================
CREATE TABLE category_mappings (
  overture_category TEXT PRIMARY KEY,
  display_category TEXT NOT NULL,  -- What users see in filters
  cuisine_group TEXT  -- For grouping: 'asian', 'european', 'american', etc.
);

-- Seed with common mappings
INSERT INTO category_mappings (overture_category, display_category, cuisine_group) VALUES
  ('italian_restaurant', 'Italian', 'european'),
  ('pizza_restaurant', 'Pizza', 'european'),
  ('mexican_restaurant', 'Mexican', 'latin'),
  ('chinese_restaurant', 'Chinese', 'asian'),
  ('japanese_restaurant', 'Japanese', 'asian'),
  ('sushi_restaurant', 'Sushi', 'asian'),
  ('thai_restaurant', 'Thai', 'asian'),
  ('indian_restaurant', 'Indian', 'asian'),
  ('vietnamese_restaurant', 'Vietnamese', 'asian'),
  ('korean_restaurant', 'Korean', 'asian'),
  ('french_restaurant', 'French', 'european'),
  ('greek_restaurant', 'Greek', 'european'),
  ('mediterranean_restaurant', 'Mediterranean', 'european'),
  ('american_restaurant', 'American', 'american'),
  ('burger_restaurant', 'Burgers', 'american'),
  ('steakhouse', 'Steakhouse', 'american'),
  ('bbq_restaurant', 'BBQ', 'american'),
  ('seafood_restaurant', 'Seafood', 'american'),
  ('cafe', 'Cafe', 'cafe'),
  ('coffee_shop', 'Coffee', 'cafe'),
  ('bakery', 'Bakery', 'cafe'),
  ('fast_food_restaurant', 'Fast Food', 'fast_food'),
  ('food_truck', 'Food Truck', 'fast_food'),
  ('bar', 'Bar', 'bar'),
  ('pub', 'Pub', 'bar'),
  ('brewery', 'Brewery', 'bar'),
  ('vegetarian_restaurant', 'Vegetarian', 'dietary'),
  ('vegan_restaurant', 'Vegan', 'dietary')
ON CONFLICT (overture_category) DO NOTHING;

-- ============================================================================
-- IMPORT TRACKING (Track Overture data refreshes)
-- ============================================================================
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  overture_release TEXT NOT NULL,  -- e.g., '2025-01'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  records_processed INTEGER,
  records_inserted INTEGER,
  records_updated INTEGER,
  status TEXT DEFAULT 'running',  -- running, completed, failed
  error_message TEXT
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Increment show count (called when restaurant is included in a session)
CREATE OR REPLACE FUNCTION increment_times_shown(restaurant_ids TEXT[])
RETURNS void AS $$
BEGIN
  UPDATE restaurants
  SET times_shown = times_shown + 1
  WHERE gers_id = ANY(restaurant_ids);
END;
$$ LANGUAGE plpgsql;

-- Record voting outcome and update pick count
CREATE OR REPLACE FUNCTION record_voting_outcome(
  p_gers_id TEXT,
  p_was_picked BOOLEAN,
  p_yes_votes INTEGER,
  p_no_votes INTEGER,
  p_participant_count INTEGER,
  p_city TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Insert outcome record
  INSERT INTO voting_outcomes (gers_id, was_picked, yes_votes, no_votes, participant_count, city, day_of_week)
  VALUES (p_gers_id, p_was_picked, p_yes_votes, p_no_votes, p_participant_count, p_city, EXTRACT(DOW FROM NOW())::INTEGER);

  -- Update restaurant pick count if it was picked
  IF p_was_picked THEN
    UPDATE restaurants SET times_picked = times_picked + 1 WHERE gers_id = p_gers_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Restaurants needing TripAdvisor linking
CREATE VIEW restaurants_needing_ta_link AS
SELECT gers_id, name, lat, lng, city, state
FROM restaurants
WHERE ta_location_id IS NULL
ORDER BY times_shown DESC;  -- Prioritize frequently shown

-- Top performing restaurants
CREATE VIEW top_restaurants AS
SELECT
  gers_id,
  name,
  city,
  primary_category,
  times_shown,
  times_picked,
  pick_rate
FROM restaurants
WHERE times_shown >= 10
ORDER BY pick_rate DESC
LIMIT 100;
