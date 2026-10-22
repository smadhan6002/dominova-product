export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type QRStatus = 'active' | 'inactive' | 'expired'

/**
 * public.profiles
 * Authenticated user profile linked to auth.users(id)
 */
export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url?: string | null
  role: 'superadmin' | 'admin' | 'operator' | 'user'
  account_status?: 'active' | 'suspended' | 'pending'
  is_active?: boolean
  created_at: string
  updated_at: string
}

/**
 * public.qr_categories
 */
export interface QRCategory {
  id: string
  user_id: string
  name: string
  description?: string | null
  created_at: string
}

/**
 * public.qr_codes
 * Verified production schema
 */
export interface QRCode {
  id: string
  user_id?: string
  name: string
  qr_type?: string
  destination_url?: string
  category_id?: string | null
  foreground_color?: string | null
  background_color?: string | null
  qr_image_path?: string | null
  total_scans?: number
  status: QRStatus
  expires_at?: string | null
  created_at: string
  updated_at: string

  // UI-compatibility & customer landing page computed / associated fields
  qr_id: string
  permanent_url: string
  organization_name?: string | null
  google_reviews_url?: string | null
  instagram_url?: string | null
  website_url?: string | null
  whatsapp_url?: string | null
  assigned_at?: string | null
  category?: QRCategory | null
}

/**
 * public.qr_scans
 */
export interface QRScan {
  id: string
  qr_code_id: string
  browser?: string | null
  device_type?: string | null
  referrer?: string | null
  scanned_at: string
}

/**
 * public.social_links
 */
export interface SocialLink {
  id: string
  user_id: string
  qr_code_id?: string | null
  platform: string
  url: string
  title?: string | null
  icon?: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * public.link_pages
 */
export interface LinkPage {
  id: string
  user_id: string
  qr_code_id?: string | null
  title: string
  bio?: string | null
  slug: string
  theme?: string | null
  background_color?: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

/**
 * public.user_settings
 */
export interface UserSetting {
  user_id: string
  theme?: string | null
  default_qr_color?: string | null
  created_at: string
  updated_at: string
}

/**
 * public.activity_logs
 */
export interface ActivityLog {
  id: string
  user_id: string
  action: string
  details?: Json
  entity_type?: string | null
  entity_id?: string | null
  created_at: string
}

/**
 * public.qr_downloads
 */
export interface QRDownload {
  id: string
  user_id: string
  qr_code_id: string
  downloaded_at: string
  format: string
}

export interface DashboardStats {
  totalQRCodes: number
  availableQRCodes: number
  assignedQRCodes: number
  totalOrganizations: number
  totalScans?: number
  recentScans?: number
}
