import { createClient } from '@supabase/supabase-js'

// Production Supabase defaults matching active project (qapoyyungfqpojnqgjur)
const DEFAULT_SUPABASE_URL = 'https://qapoyyungfqpojnqgjur.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcG95eXVuZ2ZxcG9qbnFnanVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjM5NDUsImV4cCI6MjEwNzI5OTk0NX0.LAuDofV-VlJySPnTUTcS_ORUTywvpmjWZeCAMVJW820'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Use environment variables if set; otherwise fall back to verified project credentials
const rawUrl = (envUrl && envUrl.trim() !== '' ? envUrl : DEFAULT_SUPABASE_URL).trim()
const rawKey = (envKey && envKey.trim() !== '' ? envKey : DEFAULT_SUPABASE_ANON_KEY).trim()

// Clean URL and Key to protect against common formatting issues (e.g. trailing period from copied prompts)
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const supabaseAnonKey = rawKey.replace(/\.+$/, '')

/**
 * Check if live Supabase is configured with valid credentials
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('demo-project.supabase.co') &&
      !supabaseUrl.includes('your-project.supabase.co') &&
      !supabaseAnonKey.includes('demo-placeholder-key') &&
      !supabaseAnonKey.includes('your-anon-key-here') &&
      supabaseAnonKey.length > 20
  )
}

if (!envUrl || !envKey) {
  console.info(
    '[DOMINOVA] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set in build environment. Using configured project defaults for Supabase project: ' +
      supabaseUrl
  )
}

// Fallback to safe string so createClient never throws fatal uncaught exceptions at module evaluation
const safeKey = supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY
const safeUrl = supabaseUrl || DEFAULT_SUPABASE_URL

export const supabase = createClient(safeUrl, safeKey, {
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
