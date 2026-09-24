'use client'

/**
 * Client-side pre-shrink for nomination photos.
 *
 * A phone camera JPEG is 3–8MB at 4000px+. Vercel functions refuse request
 * bodies over 4.5MB, and nothing we render is wider than ~1000px, so the
 * browser downsizes first: longest edge 2000px, JPEG at 0.85 (typically
 * 300–800KB). The server then normalizes again (see lib/photos.ts), so this
 * is a bandwidth and reliability win, not the source of truth.
 *
 * Falls back to the original file when the browser can't decode it (rare
 * formats, very old browsers) — the server still handles it.
 */
export const UPLOAD_MAX_EDGE = 2000
const JPEG_QUALITY = 0.85

export async function shrinkImageForUpload(file: File): Promise<File> {
  // Animated GIFs would lose their animation through a canvas; let them
  // through as-is (the server flattens them to a still WebP).
  if (file.type === 'image/gif') return file

  try {
    // imageOrientation applies the EXIF rotation so a portrait phone shot
    // doesn't come out sideways once the metadata is stripped
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, UPLOAD_MAX_EDGE / Math.max(bitmap.width, bitmap.height))

    // Already small enough and already a JPEG: nothing to gain
    if (scale === 1 && file.type === 'image/jpeg' && file.size < 1.5 * 1024 * 1024) {
      bitmap.close()
      return file
    }

    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}
