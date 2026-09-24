/**
 * Run a SQL migration file against DATABASE_URL, one statement at a time
 * (the Neon HTTP driver doesn't support multi-statement queries).
 *
 * Usage: npx tsx scripts/run-sql-migration.ts scripts/db/005-overture-columns.sql
 */

import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { neon } from '@neondatabase/serverless'

config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set')
  process.exit(1)
}

const file = process.argv[2]
if (!file) {
  console.error('Usage: npx tsx scripts/run-sql-migration.ts <path-to-sql-file>')
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

  return statements.filter(s =>
    s.split('\n').some(line => {
      const t = line.trim()
      return t.length > 0 && !t.startsWith('--')
    })
  )
}

async function run() {
  const path = resolve(file)
  const statements = splitStatements(readFileSync(path, 'utf-8'))

  console.log(`Running ${statements.length} statements from ${file}...\n`)

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

  console.log('\nMigration complete.')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
