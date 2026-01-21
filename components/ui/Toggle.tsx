'use client'

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  children: ReactNode
  size?: 'sm' | 'md'
}

const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, pressed = false, onPressedChange, children, size = 'md', ...props }, ref) => {
    const handleClick = () => {
      onPressedChange?.(!pressed)
    }

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
    }

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={pressed}
        onClick={handleClick}
        className={cn(
          `
          inline-flex items-center justify-center gap-2
          font-semibold rounded-full
          transition-all duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          hover:scale-[1.02] active:scale-[0.98]
          `,
          pressed
            ? 'bg-brand-primary text-white focus-visible:ring-orange-500'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-gray-500',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Toggle.displayName = 'Toggle'

export { Toggle }

// ToggleGroup for mutually exclusive options
export interface ToggleGroupProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  className?: string
}

function ToggleGroup({ children, className }: ToggleGroupProps) {
  return (
    <div
      className={cn('inline-flex gap-1 p-1 bg-gray-100 rounded-full', className)}
      role="radiogroup"
    >
      {children}
    </div>
  )
}

export { ToggleGroup }

// ToggleGroupItem for individual options within ToggleGroup
export interface ToggleGroupItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  value: string
  selected?: boolean
  onValueSelect?: (value: string) => void
  children: ReactNode
}

const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, value, selected = false, onValueSelect, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => onValueSelect?.(value)}
        className={cn(
          `
          px-4 py-2 rounded-full
          text-sm font-semibold
          transition-all duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary
          `,
          selected
            ? 'bg-white text-brand-primary shadow-sm'
            : 'text-gray-600 hover:text-gray-900',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

ToggleGroupItem.displayName = 'ToggleGroupItem'

export { ToggleGroupItem }
