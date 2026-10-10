export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type QRStatus = 'Available' | 'Assigned'

export interface QRCode {
  id: string
  qr_id: string
  permanent_url: string
  organization_name: string | null
  google_reviews_url: string | null
  instagram_url: string | null
  website_url: string | null
  whatsapp_url: string | null
  status: QRStatus
  created_at: string
  updated_at: string
  assigned_at: string | null
}

export interface Profile {
  id: string
  username: string
  full_name: string | null
  role: 'superadmin' | 'admin' | 'operator'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Setting {
  id: string
  key: string
  value: Json
  updated_at: string
  updated_by: string | null
}

export interface DashboardStats {
  totalQRCodes: number
  availableQRCodes: number
  assignedQRCodes: number
  totalOrganizations: number
}

export interface Database {
  public: {
    Tables: {
      qr_codes: {
        Row: QRCode
        Insert: {
          id?: string
          qr_id: string
          permanent_url: string
          organization_name?: string | null
          google_reviews_url?: string | null
          instagram_url?: string | null
          website_url?: string | null
          whatsapp_url?: string | null
          status?: QRStatus
          created_at?: string
          updated_at?: string
          assigned_at?: string | null
        }
        Update: {
          id?: string
          qr_id?: string
          permanent_url?: string
          organization_name?: string | null
          google_reviews_url?: string | null
          instagram_url?: string | null
          website_url?: string | null
          whatsapp_url?: string | null
          status?: QRStatus
          updated_at?: string
          assigned_at?: string | null
        }
      }
      profiles: {
        Row: Profile
        Insert: {
          id: string
          username: string
          full_name?: string | null
          role?: 'superadmin' | 'admin' | 'operator'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string
          full_name?: string | null
          role?: 'superadmin' | 'admin' | 'operator'
          is_active?: boolean
          updated_at?: string
        }
      }
      settings: {
        Row: Setting
        Insert: {
          id?: string
          key: string
          value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          value?: Json
          updated_at?: string
          updated_by?: string | null
        }
      }
    }
    Functions: {
      get_public_qr_data: {
        Args: { p_qr_id: string }
        Returns: Json
      }
    }
  }
}
