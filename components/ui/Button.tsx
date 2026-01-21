'use client'

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'action-positive' | 'action-negative'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold
      rounded-button
      transition-all duration-200 ease-out
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      hover:scale-[1.02] active:scale-[0.98]
    `

    const variantStyles = {
      primary: `
        bg-brand-primary text-white
        hover:bg-orange-700
        focus-visible:ring-orange-500
        shadow-md hover:shadow-lg
      `,
      secondary: `
        bg-white text-brand-primary
        hover:bg-gray-50
        focus-visible:ring-orange-500
        shadow-md hover:shadow-lg
      `,
      ghost: `
        bg-transparent text-gray-700
        hover:bg-gray-100
        focus-visible:ring-gray-500
      `,
      glass: `
        bg-surface-glass text-white
        hover:bg-surface-glass-hover
        backdrop-blur-sm
        border border-surface-glass-border
        focus-visible:ring-white/50
      `,
      'action-positive': `
        bg-action-positive text-white
        hover:bg-action-positive-hover
        focus-visible:ring-green-500
        shadow-md hover:shadow-lg
      `,
      'action-negative': `
        bg-action-negative text-white
        hover:bg-action-negative-hover
        focus-visible:ring-red-500
        shadow-md hover:shadow-lg
      `,
    }

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
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

// Chip variant - used in RestaurantFilters for filter selections
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
        className={cn(
          `
          relative inline-flex items-center gap-1.5
          px-4 py-2 rounded-full
          text-base font-semibold tracking-tight
          transition-all duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
          hover:scale-[1.02] active:scale-[0.98]
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
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full border border-white" />
        )}
      </button>
    )
  }
)

Chip.displayName = 'Chip'

export { Chip }

// PanelButton - used in expanded filter panels
export interface PanelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  children: ReactNode
}

const PanelButton = forwardRef<HTMLButtonElement, PanelButtonProps>(
  ({ className, selected = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          `
          px-4 py-2 rounded-full text-sm font-semibold
          transition-all duration-150
          hover:scale-[1.03] active:scale-[0.97]
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
