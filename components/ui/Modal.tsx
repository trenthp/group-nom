'use client'

import { Fragment, ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  overlayClassName?: string
  closeOnOverlayClick?: boolean
  variant?: 'light' | 'dark'
}

function Modal({
  isOpen,
  onClose,
  children,
  className,
  overlayClassName,
  closeOnOverlayClick = true,
  variant = 'light',
}: ModalProps) {
  const isDark = variant === 'dark'

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

  // Prevent body scroll when open
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

  if (!isOpen) return null
  if (typeof document === 'undefined') return null

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <Fragment>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60',
          'animate-in fade-in duration-200',
          overlayClassName
        )}
        style={{ zIndex: 9999 }}
        onClick={handleOverlayClick}
      >
        {/* Modal Content */}
        <div
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md max-h-[90vh] overflow-hidden',
            'rounded-2xl shadow-2xl',
            'animate-in zoom-in-95 duration-200',
            isDark ? 'bg-[#333333]' : 'bg-white',
            className
          )}
          role="dialog"
          aria-modal="true"
        >
          {children}
        </div>
      </div>
    </Fragment>,
    document.body
  )
}

export { Modal }

// ModalHeader for consistent header styling
export interface ModalHeaderProps {
  children: ReactNode
  className?: string
  onClose?: () => void
  variant?: 'light' | 'dark'
}

function ModalHeader({ children, className, onClose, variant = 'light' }: ModalHeaderProps) {
  const isDark = variant === 'dark'

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
            isDark
              ? 'text-white/60 hover:text-white hover:bg-white/10'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          )}
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export { ModalHeader }

// ModalBody for consistent body styling
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

// ModalFooter for consistent footer styling
export interface ModalFooterProps {
  children: ReactNode
  className?: string
  variant?: 'light' | 'dark'
}

function ModalFooter({ children, className, variant = 'light' }: ModalFooterProps) {
  const isDark = variant === 'dark'

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4',
        isDark ? 'border-t border-white/10' : 'border-t border-gray-200',
        className
      )}
    >
      {children}
    </div>
  )
}

export { ModalFooter }
