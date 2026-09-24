/**
 * OG image for /p/[id]: the place name, where, and how many locals love
 * it, on the Dark Ember ground with the brand mark. Aggregate only.
 */

import { ImageResponse } from 'next/og'
import { getPlaceTeaser, lovedByLine } from '@/lib/teaser'

export const alt = 'A place loved by locals on Group Nom'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const place = await getPlaceTeaser(id)
  const name = place?.name ?? 'Group Nom'
  const where = place ? [place.city, place.state].filter(Boolean).join(', ') : ''
  const loved = place ? lovedByLine(place.nominationCount) : 'Places locals love'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#222222',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 22, height: 22, borderRadius: 999, background: '#EA4D19' }} />
          <div style={{ fontSize: 28, letterSpacing: 4, color: '#EA4D19', textTransform: 'uppercase' }}>Group Nom</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: name.length > 28 ? 64 : 84, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
          {where && <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.6)' }}>{where}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 40 }}>
          <div style={{ display: 'flex', width: 56, height: 56, borderRadius: 999, background: 'rgba(234,77,25,0.18)', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>❤️</div>
          <div>{loved}</div>
          <div style={{ marginLeft: 'auto', fontSize: 26, color: 'rgba(255,255,255,0.45)' }}>ad-free · community-built · no ratings</div>
        </div>
      </div>
    ),
    size
  )
}
