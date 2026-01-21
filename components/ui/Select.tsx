'use client'

import { forwardRef, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
  placeholder?: string
  variant?: 'default' | 'glass'
  error?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, variant = 'default', error, ...props }, ref) => {
    const variantStyles = {
      default: `
        bg-white text-gray-800
        border border-gray-300
        focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
      `,
      glass: `
        bg-white/95 text-gray-800
        border border-transparent
        focus:ring-2 focus:ring-white/50
        shadow-inner
      `,
    }

    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            `
            w-full px-4 py-2 pr-10
            rounded-full
            text-base font-medium
            appearance-none
            transition-all duration-150
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            `,
            variantStyles[variant],
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        {/* Dropdown arrow */}
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }
