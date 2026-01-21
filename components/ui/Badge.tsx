'use client'

import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'cuisine' | 'status' | 'local' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md'
  children: ReactNode
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-full
      whitespace-nowrap
    `

    const variantStyles = {
      default: 'bg-gray-100 text-gray-700',
      cuisine: 'bg-orange-100 text-orange-700',
      status: 'bg-blue-100 text-blue-700',
      local: 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-amber-100 text-amber-700',
      error: 'bg-red-100 text-red-700',
    }

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
    }

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }

// LocalBadge - specialized badge for local/independent restaurants
export interface LocalBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md'
}

const LocalBadge = forwardRef<HTMLSpanElement, LocalBadgeProps>(
  ({ className, size = 'md', ...props }, ref) => {
    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1',
          'bg-gradient-to-r from-orange-500 to-red-500 text-white',
          'font-semibold rounded-full',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        <span>🏠</span>
        <span>Local</span>
      </span>
    )
  }
)

LocalBadge.displayName = 'LocalBadge'

export { LocalBadge }
