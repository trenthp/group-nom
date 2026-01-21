-- Seed script for chain_names table
-- Populates common chain restaurant keywords to enable local preference filtering
--
-- Run with: psql $DATABASE_URL -f scripts/db/seed-chains.sql
-- Or use: npx tsx scripts/run-seed-chains.ts
--
-- NOTE: These are keyword patterns for substring matching (lowercase).
-- When checking if a restaurant is a chain, we do: restaurant_name.includes(keyword)
-- So "mcdonald" matches "McDonald's", "McDonalds", "McDonald's Restaurant", etc.

-- Insert common chain keywords
-- location_count is set to 100 to mark them as definite chains (threshold is 5)
INSERT INTO chain_names (name, location_count) VALUES
  -- Fast food
  ('mcdonald', 100),
  ('burger king', 100),
  ('wendy', 100),
  ('taco bell', 100),
  ('kfc', 100),
  ('popeyes', 100),
  ('chick-fil-a', 100),
  ('sonic', 100),
  ('jack in the box', 100),
  ('carl''s jr', 100),
  ('hardee', 100),
  ('whataburger', 100),
  ('in-n-out', 100),
  ('five guys', 100),
  ('shake shack', 100),
  ('white castle', 100),
  ('arby''s', 100),
  ('checkers', 100),
  ('rally''s', 100),
  ('del taco', 100),
  ('wingstop', 100),

  -- Fast casual
  ('chipotle', 100),
  ('panera', 100),
  ('qdoba', 100),
  ('moe''s', 100),
  ('firehouse subs', 100),
  ('jersey mike', 100),
  ('jimmy john', 100),
  ('subway', 100),
  ('potbelly', 100),
  ('panda express', 100),
  ('noodles & company', 100),
  ('blaze pizza', 100),
  ('mod pizza', 100),
  ('sweetgreen', 100),
  ('cava', 100),
  ('zoe''s kitchen', 100),

  -- Casual dining
  ('applebee', 100),
  ('chili''s', 100),
  ('olive garden', 100),
  ('red lobster', 100),
  ('outback', 100),
  ('texas roadhouse', 100),
  ('longhorn', 100),
  ('red robin', 100),
  ('buffalo wild wings', 100),
  ('bww', 100),
  ('cheesecake factory', 100),
  ('p.f. chang', 100),
  ('benihana', 100),
  ('hooters', 100),
  ('twin peaks', 100),
  ('ihop', 100),
  ('denny''s', 100),
  ('waffle house', 100),
  ('cracker barrel', 100),
  ('bob evans', 100),
  ('golden corral', 100),
  ('hometown buffet', 100),
  ('old country buffet', 100),

  -- Coffee & dessert
  ('starbucks', 100),
  ('dunkin', 100),
  ('caribou coffee', 100),
  ('peet''s coffee', 100),
  ('tim hortons', 100),
  ('baskin-robbins', 100),
  ('dairy queen', 100),
  ('coldstone', 100),
  ('krispy kreme', 100),

  -- Pizza chains
  ('domino''s', 100),
  ('pizza hut', 100),
  ('papa john', 100),
  ('little caesars', 100),
  ('marco''s pizza', 100),
  ('papa murphy', 100),
  ('cicis', 100),
  ('round table', 100),
  ('mountain mike', 100),

  -- Other chains
  ('yard house', 100),
  ('bj''s restaurant', 100),
  ('dave & buster', 100),
  ('topgolf', 100),
  ('main event', 100),
  ('cheddar''s', 100),
  ('carrabba', 100),
  ('maggiano', 100),
  ('bonefish grill', 100),
  ('seasons 52', 100),
  ('the capital grille', 100),
  ('eddie v', 100),
  ('ruth''s chris', 100),
  ('morton''s', 100),
  ('flemings', 100),
  ('fogo de chao', 100),
  ('nando''s', 100),
  ('raising cane', 100),
  ('zaxby', 100),
  ('culver''s', 100),
  ('portillo''s', 100),
  ('jason''s deli', 100),
  ('mcalister''s', 100),
  ('corner bakery', 100)
ON CONFLICT (name) DO UPDATE SET location_count = 100;

-- Verify the seed
SELECT COUNT(*) as chain_count FROM chain_names WHERE location_count >= 5;
