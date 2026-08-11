/**
 * Run migration 004 (nomination support) against DATABASE_URL.
 *
 * Usage: npx tsx scripts/run-migration-004.ts
 */

import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import { neon } from '@neondatabase/serverless'

config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

/** Split SQL into statements, respecting $$-quoted function bodies. */
function splitStatements(text: string): string[] {
  const statements: string[] = []
  let current = ''
  let inDollarQuote = false

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '$' && text[i + 1] === '$') {
      inDollarQuote = !inDollarQuote
      current += '$$'
      i++
      continue
    }
    if (text[i] === ';' && !inDollarQuote) {
      if (current.trim()) statements.push(current.trim())
      current = ''
      continue
    }
    current += text[i]
  }
  if (current.trim()) statements.push(current.trim())

  // Drop comment-only statements
  return statements.filter(s =>
    s.split('\n').some(line => {
      const t = line.trim()
      return t.length > 0 && !t.startsWith('--')
    })
  )
}

async function run() {
  const file = join(__dirname, 'db', '004-nomination-support.sql')
  const statements = splitStatements(readFileSync(file, 'utf-8'))

  console.log(`Running ${statements.length} statements from 004-nomination-support.sql...\n`)

  for (const stmt of statements) {
    const label = stmt.split('\n').find(l => l.trim() && !l.trim().startsWith('--'))?.slice(0, 70)
    try {
      await sql.query(stmt)
      console.log(`OK   ${label}`)
    } catch (err) {
      console.error(`FAIL ${label}`)
      throw err
    }
  }

  // Verify
  const triggers = await sql`
    SELECT trigger_name FROM information_schema.triggers
    WHERE event_object_table = 'nominations'
  `
  console.log('\nTriggers on nominations:', triggers.map((t: any) => t.trigger_name).join(', '))

  const cols = await sql`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE (table_name = 'restaurants' AND column_name = 'first_nominated_at')
       OR (table_name = 'user_profiles' AND column_name = 'enrichment_count')
  `
  console.log('New columns:', cols.map((c: any) => `${c.table_name}.${c.column_name}`).join(', '))

  console.log('\nMigration 004 complete.')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
