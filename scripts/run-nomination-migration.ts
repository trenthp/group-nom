/**
 * Run the nomination layer migration
 *
 * Usage: npx tsx scripts/run-nomination-migration.ts
 */

import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set')
    console.log('\nSet it in your terminal:')
    console.log('  $env:DATABASE_URL = "your-connection-string"')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  console.log('🚀 Running nomination layer migration...\n')

  try {
    // Run migrations in order

    // 1. User profiles
    console.log('Creating user_profiles table...')
    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        clerk_user_id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        default_lat DOUBLE PRECISION DEFAULT 28.5383,
        default_lng DOUBLE PRECISION DEFAULT -81.3792,
        default_city TEXT DEFAULT 'Orlando',
        nomination_count INTEGER DEFAULT 0,
        enrichment_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✓ user_profiles created')

    // 2. Nominations
    console.log('Creating nominations table...')
    await sql`
      CREATE TABLE IF NOT EXISTS nominations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        gers_id TEXT NOT NULL REFERENCES restaurants(gers_id) ON DELETE CASCADE,
        clerk_user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
        photo_url TEXT NOT NULL,
        why_i_love_it TEXT NOT NULL,
        my_favorite_dishes TEXT[] DEFAULT '{}',
        good_for TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (gers_id, clerk_user_id)
      )
    `
    console.log('✓ nominations created')

    // 3. Restaurant enrichment
    console.log('Creating restaurant_enrichment table...')
    await sql`
      CREATE TABLE IF NOT EXISTS restaurant_enrichment (
        gers_id TEXT PRIMARY KEY REFERENCES restaurants(gers_id) ON DELETE CASCADE,
        hours_notes TEXT,
        hours_updated_at TIMESTAMP,
        menu_url TEXT,
        menu_updated_at TIMESTAMP,
        parking_notes TEXT,
        parking_updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✓ restaurant_enrichment created')

    // 4. Add nomination columns to restaurants
    console.log('Adding nomination columns to restaurants...')
    try {
      await sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS nomination_count INTEGER DEFAULT 0`
      await sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS first_nominated_at TIMESTAMP`
      console.log('✓ nomination columns added to restaurants')
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log('✓ nomination columns already exist')
      } else {
        throw e
      }
    }

    // 5. User favorites
    console.log('Creating user_favorites table...')
    await sql`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        clerk_user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
        gers_id TEXT NOT NULL REFERENCES restaurants(gers_id) ON DELETE CASCADE,
        source TEXT DEFAULT 'discover' CHECK (source IN ('discover', 'group_vote', 'nomination')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (clerk_user_id, gers_id)
      )
    `
    console.log('✓ user_favorites created')

    // 6. Swipe history
    console.log('Creating swipe_history table...')
    await sql`
      CREATE TABLE IF NOT EXISTS swipe_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        clerk_user_id TEXT NOT NULL REFERENCES user_profiles(clerk_user_id) ON DELETE CASCADE,
        gers_id TEXT NOT NULL REFERENCES restaurants(gers_id) ON DELETE CASCADE,
        action TEXT NOT NULL CHECK (action IN ('like', 'dislike', 'skip')),
        swiped_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (clerk_user_id, gers_id)
      )
    `
    console.log('✓ swipe_history created')

    // 7. Create indexes
    console.log('Creating indexes...')
    await sql`CREATE INDEX IF NOT EXISTS idx_nominations_restaurant ON nominations(gers_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_nominations_user ON nominations(clerk_user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_nominations_created ON nominations(created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(clerk_user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_user_favorites_restaurant ON user_favorites(gers_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_swipe_history_user ON swipe_history(clerk_user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_swipe_history_user_action ON swipe_history(clerk_user_id, action)`
    console.log('✓ indexes created')

    // 8. Create functions
    console.log('Creating trigger functions...')

    await sql`
      CREATE OR REPLACE FUNCTION increment_nomination_count()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE restaurants
        SET
          nomination_count = nomination_count + 1,
          first_nominated_at = COALESCE(first_nominated_at, NOW())
        WHERE gers_id = NEW.gers_id;

        UPDATE user_profiles
        SET nomination_count = nomination_count + 1
        WHERE clerk_user_id = NEW.clerk_user_id;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `

    await sql`
      CREATE OR REPLACE FUNCTION decrement_nomination_count()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE restaurants
        SET nomination_count = GREATEST(nomination_count - 1, 0)
        WHERE gers_id = OLD.gers_id;

        UPDATE user_profiles
        SET nomination_count = GREATEST(nomination_count - 1, 0)
        WHERE clerk_user_id = OLD.clerk_user_id;

        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql
    `
    console.log('✓ trigger functions created')

    // 9. Create triggers (drop first if exists to avoid errors)
    console.log('Creating triggers...')
    await sql`DROP TRIGGER IF EXISTS nomination_created ON nominations`
    await sql`DROP TRIGGER IF EXISTS nomination_deleted ON nominations`

    await sql`
      CREATE TRIGGER nomination_created
        AFTER INSERT ON nominations
        FOR EACH ROW
        EXECUTE FUNCTION increment_nomination_count()
    `

    await sql`
      CREATE TRIGGER nomination_deleted
        AFTER DELETE ON nominations
        FOR EACH ROW
        EXECUTE FUNCTION decrement_nomination_count()
    `
    console.log('✓ triggers created')

    console.log('\n✅ Migration complete!')
    console.log('\nTables created:')
    console.log('  - user_profiles')
    console.log('  - nominations')
    console.log('  - restaurant_enrichment')
    console.log('  - user_favorites')
    console.log('  - swipe_history')
    console.log('\nColumns added to restaurants:')
    console.log('  - nomination_count')
    console.log('  - first_nominated_at')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
