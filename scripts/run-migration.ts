import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log('Running TripAdvisor migration...\n');

  try {
    // Step 1: Add TripAdvisor columns
    console.log('Step 1: Adding TripAdvisor columns...');
    await sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS ta_location_id TEXT`;
    await sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS ta_photo_urls TEXT[] DEFAULT '{}'`;
    await sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS ta_price_level TEXT`;
    await sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS ta_linked_at TIMESTAMP`;
    console.log('✓ Columns added\n');

    // Step 2: Create index
    console.log('Step 2: Creating TripAdvisor unlinked index...');
    await sql`CREATE INDEX IF NOT EXISTS idx_restaurants_ta_unlinked ON restaurants(gers_id) WHERE ta_location_id IS NULL`;
    console.log('✓ Index created\n');

    // Step 3: Drop views that depend on Foursquare columns
    console.log('Step 3: Dropping views that depend on Foursquare columns...');
    await sql`DROP VIEW IF EXISTS restaurants_needing_fsq_link`;
    await sql`DROP VIEW IF EXISTS top_restaurants`;
    console.log('✓ Dependent views dropped\n');

    // Step 4: Drop Foursquare index
    console.log('Step 4: Dropping Foursquare index...');
    await sql`DROP INDEX IF EXISTS idx_restaurants_fsq_unlinked`;
    console.log('✓ Foursquare index dropped\n');

    // Step 5: Drop Foursquare columns
    console.log('Step 5: Dropping Foursquare columns...');
    await sql`ALTER TABLE restaurants DROP COLUMN IF EXISTS fsq_place_id`;
    await sql`ALTER TABLE restaurants DROP COLUMN IF EXISTS fsq_photo_ids`;
    await sql`ALTER TABLE restaurants DROP COLUMN IF EXISTS fsq_rating`;
    await sql`ALTER TABLE restaurants DROP COLUMN IF EXISTS fsq_price_level`;
    await sql`ALTER TABLE restaurants DROP COLUMN IF EXISTS fsq_linked_at`;
    console.log('✓ Foursquare columns dropped\n');

    // Step 6: Recreate views
    console.log('Step 6: Creating views...');
    await sql`
      CREATE OR REPLACE VIEW restaurants_needing_ta_link AS
      SELECT gers_id, name, lat, lng, city, state
      FROM restaurants
      WHERE ta_location_id IS NULL
      ORDER BY times_shown DESC
    `;
    await sql`
      CREATE OR REPLACE VIEW top_restaurants AS
      SELECT gers_id, name, city, primary_category, times_shown, times_picked, pick_rate
      FROM restaurants
      WHERE times_shown >= 10
      ORDER BY pick_rate DESC
      LIMIT 100
    `;
    console.log('✓ Views created\n');

    // Verify
    console.log('=== Verification ===');
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'restaurants'
      AND column_name LIKE 'ta_%'
      ORDER BY column_name
    `;
    console.log('TripAdvisor columns:', cols.map((c: any) => c.column_name).join(', '));

    const fsqCols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'restaurants'
      AND column_name LIKE 'fsq_%'
    `;
    console.log('Foursquare columns remaining:', fsqCols.length === 0 ? 'none (good!)' : fsqCols.map((c: any) => c.column_name).join(', '));

    const size = await sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size`;
    console.log('Database size:', size[0].size);

    console.log('\n✓ Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
