'use client'

import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: ReactNode
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-surface-card rounded-card shadow-card',
      glass: 'bg-surface-glass backdrop-blur-sm border border-surface-glass-border rounded-2xl',
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
        className={cn(variantStyles[variant], paddingStyles[padding], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export { Card }

// CardHeader for structured card layouts
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

// CardContent for main card content
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('', className)} {...props}>
        {children}
      </div>
    )
  }
)

CardContent.displayName = 'CardContent'

export { CardContent }

// CardFooter for card actions
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mt-4 pt-4 border-t border-gray-200', className)} {...props}>
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

export { CardFooter }
