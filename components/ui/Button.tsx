'use client'

import { forwardRef, AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Dark Ember (default surfaces): primary | secondary | ghost
 * Shared: positive | negative (voting actions)
 * Sunset Glass (session mode only): glass | inverse
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'positive'
  | 'negative'
  | 'glass'
  | 'inverse'

export type ButtonSize = 'sm' | 'md' | 'lg'

const baseStyles = `
  inline-flex items-center justify-center gap-2
  font-bold
  transition-all duration-200 ease-out
  focus:outline-none focus-visible:ring-2
  disabled:opacity-50 disabled:cursor-not-allowed
  motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]
`

// Dark variants ring-offset against the page; glass variants sit on the
// sunset gradient where an offset color can't match, so they ring inset.
const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    rounded-card
    bg-brand text-white
    hover:bg-brand-hover
    focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page
  `,
  secondary: `
    rounded-card
    bg-white/10 text-white
    hover:bg-white/20
    focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page
  `,
  ghost: `
    rounded-card
    bg-transparent text-white/70 font-semibold
    hover:bg-white/5 hover:text-white
    focus-visible:ring-white/60
  `,
  positive: `
    rounded-pill
    bg-action-positive text-white
    hover:bg-action-positive-hover
    focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-action-positive
    shadow-md hover:shadow-lg
  `,
  negative: `
    rounded-pill
    bg-action-negative text-white
    hover:bg-action-negative-hover
    focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-action-negative
    shadow-md hover:shadow-lg
  `,
  glass: `
    rounded-pill font-semibold
    bg-surface-glass text-white
    hover:bg-surface-glass-hover
    backdrop-blur-sm
    border border-surface-glass-border
    focus-visible:ring-white/80
  `,
  inverse: `
    rounded-pill font-semibold
    bg-white text-orange-600
    hover:bg-orange-50
    focus-visible:ring-white/80
    shadow-md hover:shadow-lg
  `,
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
}

/**
 * The button look as a class string, for the places that must be a link
 * (`LinkButton`, external anchors) or a Leaflet popup control rather than a
 * <button>. Keeps every "button-shaped thing" on one set of styles.
 */
export function buttonClassName(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string
) {
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], className)
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClassName(variant, size, className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }

// LinkButton - a navigation link that looks like a Button. Internal hrefs go
// through next/link; `external` renders a plain anchor in a new tab.
export interface LinkButtonProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
  external?: boolean
  children: ReactNode
}

const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, href, variant = 'primary', size = 'md', external = false, children, ...props }, ref) => {
    const classes = buttonClassName(variant, size, className)
    if (external) {
      return (
        <a ref={ref} href={href} target="_blank" rel="noopener noreferrer" className={classes} {...props}>
          {children}
        </a>
      )
    }
    return (
      <Link ref={ref} href={href} className={classes} {...props}>
        {children}
      </Link>
    )
  }
)

LinkButton.displayName = 'LinkButton'

export { LinkButton }

// Chip - filter selections in the session flow (Sunset Glass skin)
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string
  edited?: boolean
  expanded?: boolean
  hasDropdown?: boolean
  children?: ReactNode
}

const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, value, edited = false, expanded = false, hasDropdown = true, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-expanded={hasDropdown ? expanded : undefined}
        className={cn(
          `
          relative inline-flex items-center gap-1.5
          px-4 py-2 rounded-pill
          text-base font-semibold tracking-tight
          transition-all duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80
          motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]
          `,
          edited
            ? 'bg-white text-orange-600 shadow-md shadow-orange-900/25'
            : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm border border-white/15',
          expanded && 'ring-2 ring-white/50 scale-[1.02]',
          className
        )}
        {...props}
      >
        {value}
        {children}
        {hasDropdown && (
          <svg
            aria-hidden="true"
            className={cn(
              'w-3.5 h-3.5 opacity-50 transition-transform duration-200 ease-out',
              expanded && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        )}
        {edited && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full border border-white"
          />
        )}
      </button>
    )
  }
)

Chip.displayName = 'Chip'

export { Chip }

// PanelButton - options inside expanded filter panels (Sunset Glass skin)
export interface PanelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  children: ReactNode
}

const PanelButton = forwardRef<HTMLButtonElement, PanelButtonProps>(
  ({ className, selected = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-pressed={selected}
        className={cn(
          `
          px-4 py-2 rounded-pill text-sm font-semibold
          transition-all duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80
          motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]
          `,
          selected
            ? 'bg-white text-orange-600 shadow-sm'
            : 'bg-white/15 text-white hover:bg-white/25 border border-white/10',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

PanelButton.displayName = 'PanelButton'

export { PanelButton }
