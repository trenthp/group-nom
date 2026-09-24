'use client'

import { HTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LocationIcon } from '@/components/icons'
import { Badge, NominationBadge } from '@/components/ui'

/**
 * The one way a place is drawn on a Dark Ember surface.
 *
 * Every list row, deck card, sheet, and map popup composes these pieces so
 * the same place looks like the same place everywhere:
 *
 *   <PlaceCard href="/restaurant/…">
 *     <PlacePhoto src={…} alt={…} loved height="md" />
 *     <PlaceBody>
 *       <PlaceTitle>…</PlaceTitle>
 *       <PlaceAddress>…</PlaceAddress>
 *       <PlaceMeta nominationCount={…} cuisines={…} dishes={…} />
 *     </PlaceBody>
 *   </PlaceCard>
 *
 * Positive-only: the only counts here are nominations. No ratings, no stars.
 */

export interface PlaceCardProps extends HTMLAttributes<HTMLElement> {
  /** Makes the whole card a link (list rows, member pages). */
  href?: string
  /** Hover affordance without a link (e.g. a card with its own buttons). */
  interactive?: boolean
  /** Drop the card surface (for a card that lives inside a sheet or popup). */
  bare?: boolean
  children: ReactNode
}

export function PlaceCard({ href, interactive, bare, className, children, ...props }: PlaceCardProps) {
  const classes = cn(
    !bare && 'bg-surface-card rounded-card overflow-hidden',
    (href || interactive) && !bare && 'transition hover:bg-surface-card-hover',
    href && 'block group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
    className
  )
  if (href) {
    return (
      <Link href={href} className={classes} {...(props as HTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    )
  }
  return (
    <div className={classes} {...(props as HTMLAttributes<HTMLDivElement>)}>
      {children}
    </div>
  )
}

export interface PlacePhotoProps {
  src?: string | null
  alt?: string
  /** Loved places (nominated) get the ember placeholder; the rest wait in the dark. */
  loved?: boolean
  /** sm: popup / row · md: list card · lg: deck card / sheet */
  height?: 'sm' | 'md' | 'lg'
  className?: string
  children?: ReactNode
}

const photoHeights = { sm: 'h-28', md: 'h-40', lg: 'h-56' }
const placeholderHeights = { sm: 'h-20', md: 'h-24', lg: 'h-32' }

export function PlacePhoto({ src, alt = '', loved = false, height = 'md', className, children }: PlacePhotoProps) {
  return (
    <div className={cn('relative w-full overflow-hidden', className)}>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn('w-full object-cover', photoHeights[height])}
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn(
            'w-full flex items-center justify-center',
            placeholderHeights[height],
            loved ? 'bg-gradient-to-br from-orange-900/40 to-red-900/40' : 'bg-white/5'
          )}
        >
          <span className={height === 'sm' ? 'text-2xl' : 'text-3xl'}>{loved ? '❤️' : '🍽️'}</span>
        </div>
      )}
      {children}
    </div>
  )
}

export interface PlaceBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** sm for popups and compact rows. */
  padding?: 'sm' | 'md'
  children: ReactNode
}

export function PlaceBody({ padding = 'md', className, children, ...props }: PlaceBodyProps) {
  return (
    <div className={cn(padding === 'sm' ? 'p-3' : 'p-4', className)} {...props}>
      {children}
    </div>
  )
}

export interface PlaceTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** md for rows and list cards, lg for deck cards and sheets. */
  size?: 'md' | 'lg'
  /** Rendered heading level; visual size comes from `size`. */
  as?: 'h2' | 'h3'
  children: ReactNode
}

export function PlaceTitle({ size = 'md', as: Tag = 'h3', className, children, ...props }: PlaceTitleProps) {
  return (
    <Tag
      className={cn(
        'font-semibold text-white leading-tight group-hover:text-brand transition',
        size === 'lg' ? 'text-xl' : 'text-lg',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

export interface PlaceAddressProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Single line with an ellipsis (compact rows). */
  truncate?: boolean
  children: ReactNode
}

export function PlaceAddress({ truncate = false, className, children, ...props }: PlaceAddressProps) {
  return (
    <p className={cn('text-white/60 text-sm mt-1 flex items-start gap-1.5 min-w-0', className)} {...props}>
      <LocationIcon size={14} className="mt-0.5 shrink-0" />
      <span className={cn('min-w-0', truncate && 'truncate')}>{children}</span>
    </p>
  )
}

export interface PlaceMetaProps {
  nominationCount?: number
  cuisines?: string[]
  dishes?: string[]
  /** Chips beyond this are dropped; rows and popups keep it low. */
  maxChips?: number
  className?: string
}

/**
 * Overture category tags arrive as `bar_and_grill_restaurant`; members
 * should read "Bar and grill". Already-human labels pass through untouched.
 */
export function cuisineLabel(tag: string): string {
  if (/[A-Z ]/.test(tag)) return tag
  const words = tag.replace(/_restaurant$/, '').replace(/_/g, ' ').trim()
  if (!words) return 'Restaurant'
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * The love signal and the descriptive chips, in one row, in one order:
 * nominations first, then favorite dishes, then cuisines.
 */
export function PlaceMeta({ nominationCount = 0, cuisines = [], dishes = [], maxChips = 4, className }: PlaceMetaProps) {
  const dishChips = dishes.slice(0, maxChips)
  const cuisineChips = Array.from(new Set(cuisines.map(cuisineLabel))).slice(
    0,
    Math.max(0, maxChips - dishChips.length)
  )
  if (nominationCount === 0 && dishChips.length === 0 && cuisineChips.length === 0) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 mt-2', className)}>
      {nominationCount > 0 && <NominationBadge count={nominationCount} size="sm" />}
      {dishChips.map((dish) => (
        <Badge key={`dish-${dish}`} variant="dish" size="sm">
          {dish}
        </Badge>
      ))}
      {cuisineChips.map((c) => (
        <Badge key={`cuisine-${c}`} variant="default" size="sm">
          {c}
        </Badge>
      ))}
    </div>
  )
}
