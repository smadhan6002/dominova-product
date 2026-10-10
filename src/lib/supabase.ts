import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-placeholder-key'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase environment variables in .env. Running in client mode.')
}

// Untyped generic client allows flexible schema calls without strict Supabase generated generic schema constraints
export const supabase = createClient<any>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

export const QR_DOMAIN = import.meta.env.VITE_QR_DOMAIN || 'https://product-nu-lyart.vercel.app'
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'DOMINOVA'
