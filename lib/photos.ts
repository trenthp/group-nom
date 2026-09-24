import { del } from '@vercel/blob'

const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/

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
