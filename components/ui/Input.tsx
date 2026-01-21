'use client'

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'search' | 'glass'
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'default', leftIcon, rightIcon, error, ...props }, ref) => {
    const variantStyles = {
      default: `
        bg-white text-gray-800
        border border-gray-300
        focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
        placeholder-gray-400
      `,
      search: `
        bg-gray-100 text-gray-800
        border border-transparent
        focus:bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
        placeholder-gray-500
      `,
      glass: `
        bg-white/95 text-gray-800
        border border-transparent
        focus:ring-2 focus:ring-white/50
        placeholder-gray-400
        shadow-inner
      `,
    }

    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            `
            w-full px-4 py-2 rounded-full
            text-base font-medium
            transition-all duration-150
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            `,
            variantStyles[variant],
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
