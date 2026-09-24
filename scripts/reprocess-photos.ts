/**
 * Re-encode nomination photos that were stored before the upload route
 * normalized them (camera originals, 3000–4000px, EXIF/GPS intact).
 *
 * For each nomination whose photo is on our Blob host and isn't already a
 * WebP: download it, run it through the same normalizePhoto() the upload
 * route uses (orient, cap at 1600px, WebP, strip metadata), upload the
 * result next to the original, point the row at it, then delete the
 * original. One photo at a time; safe to re-run — already-converted rows
 * are skipped.
 *
 * Usage:
 *   npx tsx scripts/reprocess-photos.ts --dry-run   # report only, writes nothing
 *   npx tsx scripts/reprocess-photos.ts             # convert
 */

import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'
import { put, del } from '@vercel/blob'
import { normalizePhoto, PHOTO_CONTENT_TYPE } from '../lib/photos'

config({ path: '.env.local' })

const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/
const dryRun = process.argv.includes('--dry-run')

for (const name of ['DATABASE_URL', 'BLOB_READ_WRITE_TOKEN']) {
  if (!process.env[name]) {
    console.error(`ERROR: ${name} is not set`)
    process.exit(1)
  }
}

const sql = neon(process.env.DATABASE_URL!)

function onOurHost(url: string): boolean {
  try {
    return BLOB_HOST.test(new URL(url).hostname)
  } catch {
    return false
  }
}

function kb(n: number) {
  return `${Math.round(n / 1024)}KB`
}

async function main() {
  const rows = (await sql`
    SELECT id, gers_id, clerk_user_id, photo_url
    FROM nominations
    WHERE photo_url IS NOT NULL
    ORDER BY created_at
  `) as Array<{ id: string; gers_id: string; clerk_user_id: string; photo_url: string }>

  const candidates = rows.filter(
    (r) => onOurHost(r.photo_url) && !/\.webp(\?|$)/i.test(r.photo_url)
  )

  console.log(
    `${rows.length} nomination photo(s); ${candidates.length} not yet normalized${dryRun ? ' (dry run)' : ''}`
  )

  let beforeTotal = 0
  let afterTotal = 0
  let failed = 0

  for (const row of candidates) {
    try {
      const res = await fetch(row.photo_url)
      if (!res.ok) throw new Error(`download ${res.status}`)
      const original = await res.arrayBuffer()
      const photo = await normalizePhoto(original)
      beforeTotal += original.byteLength
      afterTotal += photo.buffer.length

      console.log(
        `${row.id}  ${kb(original.byteLength)} → ${kb(photo.buffer.length)}  ${photo.width}x${photo.height}`
      )
      if (dryRun) continue

      const filename = `nominations/${row.gers_id}/${row.clerk_user_id}-${Date.now()}.webp`
      const blob = await put(filename, photo.buffer, {
        access: 'public',
        addRandomSuffix: true,
        contentType: PHOTO_CONTENT_TYPE,
      })
      await sql`UPDATE nominations SET photo_url = ${blob.url} WHERE id = ${row.id}`
      await del(row.photo_url)
    } catch (error) {
      failed++
      console.error(`${row.id}  FAILED`, error instanceof Error ? error.message : error)
    }
  }

  if (candidates.length > 0) {
    console.log(
      `\nTotal ${kb(beforeTotal)} → ${kb(afterTotal)}` +
        (beforeTotal > 0 ? ` (${Math.round((1 - afterTotal / beforeTotal) * 100)}% smaller)` : '') +
        (failed ? `, ${failed} failed` : '')
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
