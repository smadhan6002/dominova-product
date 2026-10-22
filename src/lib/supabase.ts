import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qapoyyungfqpojnqgjur.supabase.co'
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Clean URL and Key to protect against common formatting issues (e.g. trailing period from copied prompts)
const supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const supabaseAnonKey = rawKey.trim().replace(/\.+$/, '')

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase environment variables in .env.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export const QR_DOMAIN = import.meta.env.VITE_QR_DOMAIN || 'https://product-nu-lyart.vercel.app'
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'DOMINOVA'

// Storage bucket identifiers
export const STORAGE_BUCKETS = {
  QR_CODES: 'qr-codes',         // private
  PROFILE_IMAGES: 'profile-images', // public
  BRAND_ASSETS: 'brand-assets',   // private
} as const

/**
 * Build a user-scoped storage path: <user-uuid>/<filename>
 */
export function buildUserStoragePath(userId: string, filename: string): string {
  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${userId}/${Date.now()}_${cleanFilename}`
}
