import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function timeAgo(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHr < 24) return `${diffHr} hr ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return formatDateShort(date)
}

/**
 * Formats a sequential number to QR ID format.
 * Numbers below 100 are padded with 3 digits (e.g. 1 -> 001, 50 -> 050, 99 -> 099).
 * Numbers 100 and above expand naturally (100 -> 100, 105 -> 105).
 */
export function formatQRId(num: number | string): string {
  const parsed = typeof num === 'string' ? parseInt(num, 10) : num
  if (isNaN(parsed) || parsed < 0) {
    return String(num).padStart(3, '0')
  }
  if (parsed < 100) {
    return String(parsed).padStart(3, '0')
  }
  return String(parsed)
}

/**
 * Builds the complete permanent URL:
 * https://YOUR-VERCEL-DOMAIN.vercel.app/product/:id
 */
export function buildPermanentUrl(baseUrl: string, qrId: string): string {
  const cleanBase = (baseUrl || '').trim().replace(/\/+$/, '')
  const formattedId = formatQRId(qrId)
  
  if (!cleanBase) {
    return `/product/${formattedId}`
  }
  
  if (cleanBase.endsWith('/product')) {
    return `${cleanBase}/${formattedId}`
  }
  
  return `${cleanBase}/product/${formattedId}`
}

/**
 * Validates that a string is a valid HTTP or HTTPS URL (or empty if optional).
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Normalizes WhatsApp input into a full https://wa.me/... link
 */
export function normalizeWhatsAppUrl(input: string): string {
  if (!input) return ''
  const trimmed = input.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  const digitsOnly = trimmed.replace(/[^\d]/g, '')
  if (digitsOnly) {
    return `https://wa.me/${digitsOnly}`
  }
  return trimmed
}

export function truncate(str: string, length: number): string {
  if (!str) return ''
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    throw new Error('Clipboard API unavailable')
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      return successful
    } catch {
      document.body.removeChild(textarea)
      return false
    }
  }
}
