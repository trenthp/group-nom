import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes: clsx for conditionals, tailwind-merge so a
 * className prop can override a variant's classes instead of fighting them.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
