'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  /** Accessible name for the dialog (use when there's no visible ModalHeader). */
  ariaLabel?: string
  className?: string
  overlayClassName?: string
  closeOnOverlayClick?: boolean
  /** raised (default): Dark Ember. light: Sunset Glass session mode. */
  variant?: 'raised' | 'light'
}

function Modal({
  isOpen,
  onClose,
  children,
  ariaLabel,
  className,
  overlayClassName,
  closeOnOverlayClick = true,
  variant = 'raised',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Move focus into the dialog on open; restore it on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
      dialogRef.current?.focus()
      return () => {
        previousFocusRef.current?.focus?.()
      }
    }
  }, [isOpen])

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div
      className={cn('fixed inset-0 bg-black/60 motion-safe:animate-fade-in', overlayClassName)}
      style={{ zIndex: 9999 }}
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-md max-h-[90vh] overflow-hidden',
          'rounded-2xl shadow-card focus:outline-none',
          'motion-safe:animate-modal-in',
          variant === 'raised' ? 'bg-surface-card text-white' : 'bg-white text-gray-800',
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export { Modal }

export interface ModalHeaderProps {
  children: ReactNode
  className?: string
  onClose?: () => void
  variant?: 'raised' | 'light'
}

function ModalHeader({ children, className, onClose, variant = 'raised' }: ModalHeaderProps) {
  const isDark = variant === 'raised'

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4',
        isDark ? 'border-b border-white/10' : 'border-b border-gray-200',
        className
      )}
    >
      <div className={cn('font-bold text-lg', isDark ? 'text-white' : 'text-gray-800')}>
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-full transition-colors',
            'focus:outline-none focus-visible:ring-2',
            isDark
              ? 'text-white/60 hover:text-white hover:bg-white/10 focus-visible:ring-white/60'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-500'
          )}
          aria-label="Close dialog"
        >
          <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export { ModalHeader }

export interface ModalBodyProps {
  children: ReactNode
  className?: string
}

function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn('overflow-y-auto', className)} style={{ maxHeight: 'calc(90vh - 140px)' }}>
      {children}
    </div>
  )
}

export { ModalBody }

export interface ModalFooterProps {
  children: ReactNode
  className?: string
  variant?: 'raised' | 'light'
}

function ModalFooter({ children, className, variant = 'raised' }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4',
        variant === 'raised' ? 'border-t border-white/10' : 'border-t border-gray-200',
        className
      )}
    >
      {children}
    </div>
  )
}

export { ModalFooter }
