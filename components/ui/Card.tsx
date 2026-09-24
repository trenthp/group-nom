'use client'

import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * raised (default): Dark Ember card surface.
   * glass / light: Sunset Glass session-mode surfaces.
   */
  variant?: 'raised' | 'glass' | 'light'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Renders hover affordance (for clickable/linked cards). */
  interactive?: boolean
  children: ReactNode
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'raised', padding = 'md', interactive = false, children, ...props }, ref) => {
    const variantStyles = {
      raised: 'bg-surface-card rounded-card',
      glass: 'bg-surface-glass backdrop-blur-glass border border-surface-glass-border rounded-2xl',
      light: 'bg-white rounded-2xl shadow-card-light text-gray-800',
    }

    const interactiveStyles = {
      raised: 'transition hover:bg-surface-card-hover',
      glass: 'transition hover:bg-surface-glass-hover',
      light: 'transition hover:shadow-2xl',
    }

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }

    return (
      <div
        ref={ref}
        className={cn(
          variantStyles[variant],
          interactive && interactiveStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export { Card }

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mb-4', className)} {...props}>
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

export { CardHeader }

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    )
  }
)

CardContent.displayName = 'CardContent'

export { CardContent }

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mt-4 pt-4 border-t border-white/10', className)} {...props}>
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

export { CardFooter }
