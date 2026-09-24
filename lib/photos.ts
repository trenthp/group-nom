import { del } from '@vercel/blob'
import sharp from 'sharp'

const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/

/**
 * The one size we store. Nothing renders a nomination photo wider than
 * ~1000px (restaurant hero on a wide screen), so 1600px on the long edge
 * keeps it sharp on 2x displays with headroom, at roughly a tenth of a
 * camera original. WebP at 82 lands most photos in 150–400KB.
 */
export const PHOTO_MAX_EDGE = 1600
export const PHOTO_WEBP_QUALITY = 82
export const PHOTO_CONTENT_TYPE = 'image/webp'

export interface NormalizedPhoto {
  buffer: Buffer
  width: number
  height: number
}

/**
 * Normalize an uploaded photo for storage: auto-orient from EXIF, cap the
 * long edge, re-encode as WebP, and drop every byte of metadata — camera
 * originals carry GPS coordinates of wherever the member was standing, and
 * a public Blob URL must never leak that. Animated GIFs become a still.
 * Throws on anything sharp can't decode; the caller turns that into a 400.
 */
export async function normalizePhoto(input: ArrayBuffer | Buffer): Promise<NormalizedPhoto> {
  const { data, info } = await sharp(Buffer.from(input as ArrayBuffer), { animated: false })
    .rotate() // apply EXIF orientation before the metadata goes
    .resize({
      width: PHOTO_MAX_EDGE,
      height: PHOTO_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: PHOTO_WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true })
  return { buffer: data, width: info.width, height: info.height }
}

/**
 * Best-effort removal of a nomination photo from Blob storage.
 *
 * Deleting a nomination row must never fail because storage hiccuped, so
 * this swallows errors. Only URLs on our Blob host are touched — a
 * community-added place could in principle carry any URL.
 */
export async function deletePhotoBlob(photoUrl: string | null | undefined): Promise<void> {
  if (!photoUrl) return
  try {
    const host = new URL(photoUrl).hostname
    if (!BLOB_HOST.test(host)) return
    await del(photoUrl)
  } catch (error) {
    console.warn('[photos] Could not delete blob', photoUrl, error)
  }
}
