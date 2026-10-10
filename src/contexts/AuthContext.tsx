import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import { hashPassword, verifyPassword } from '@/lib/crypto'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ADMIN_STORAGE_KEY = 'dominova_admin_credential_vault'
const SESSION_STORAGE_KEY = 'dominova_active_session'

interface StoredAdmin {
  id: string
  username: string
  email: string
  fullName: string
  salt: string
  hash: string
  updatedAt: string
}

const DEFAULT_ADMIN_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'dominova',
  full_name: 'DOMINOVA Administrator',
  role: 'superadmin',
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const createMockUser = (admin: StoredAdmin): User => {
  return {
    id: admin.id,
    email: admin.email,
    app_metadata: { provider: 'dominova_vault' },
    user_metadata: { full_name: admin.fullName, username: admin.username },
    aud: 'authenticated',
    created_at: admin.updatedAt,
  } as unknown as User
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize and verify secure account provisioning
  useEffect(() => {
    const initProvisioning = async () => {
      try {
        let stored = localStorage.getItem(ADMIN_STORAGE_KEY)
        // Check legacy key if exists
        if (!stored) {
          const legacy = localStorage.getItem('dominor_admin_credential_vault')
          if (legacy) {
            localStorage.setItem(ADMIN_STORAGE_KEY, legacy)
            stored = legacy
          }
        }

        if (!stored) {
          // Provision initial admin: username dominova, initial password Dominova@product
          const { hash, salt } = await hashPassword('Dominova@product')
          const initialAdmin: StoredAdmin = {
            id: '00000000-0000-0000-0000-000000000001',
            username: 'dominova',
            email: 'admin@dominova.in',
            fullName: 'DOMINOVA Administrator',
            salt,
            hash,
            updatedAt: new Date().toISOString(),
          }
          localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(initialAdmin))
        }

        // Check active session
        const activeSession = localStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem('dominor_active_session')
        if (activeSession) {
          const adminData: StoredAdmin = JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY) || '{}')
          if (adminData.username) {
            setUser(createMockUser(adminData))
            setProfile({
              id: adminData.id,
              username: adminData.username,
              full_name: adminData.fullName,
              role: 'superadmin',
              is_active: true,
              created_at: adminData.updatedAt,
              updated_at: adminData.updatedAt,
            })
            setLoading(false)
            return
          }
        }

        // Try Supabase auth session if configured
        const url = import.meta.env.VITE_SUPABASE_URL || ''
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        if (url && key && !url.includes('demo-project.supabase.co')) {
          const { data } = await supabase.auth.getSession()
          if (data.session?.user) {
            setSession(data.session)
            setUser(data.session.user)
            const { data: p } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .maybeSingle()
            if (p) setProfile(p)
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        setLoading(false)
      }
    }

    initProvisioning()
  }, [])

  const signIn = async (identifier: string, password: string): Promise<{ error: string | null }> => {
    const cleanId = identifier.trim().toLowerCase()

    // 1. Check local admin vault
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY)
      if (stored) {
        const admin: StoredAdmin = JSON.parse(stored)
        const isMatch =
          cleanId === admin.username.toLowerCase() ||
          cleanId === admin.email.toLowerCase() ||
          cleanId === 'admin@dominova.in' ||
          cleanId === 'admin' ||
          cleanId === 'deepak'

        // Accept primary password, or backup credentials
        if (isMatch) {
          const isValid = await verifyPassword(password, admin.hash, admin.salt)
          const isBackupPass = password === 'Dominova@product' || password === '5438'
          if (isValid || isBackupPass) {
            const userObj = createMockUser(admin)
            setUser(userObj)
            setProfile({
              id: admin.id,
              username: admin.username,
              full_name: admin.fullName,
              role: 'superadmin',
              is_active: true,
              created_at: admin.updatedAt,
              updated_at: admin.updatedAt,
            })
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: admin.id, loggedInAt: new Date().toISOString() }))
            return { error: null }
          }
        }
      }
    } catch (err) {
      console.warn('Local credential verification check error:', err)
    }

    // 2. Fallback to Supabase Auth if real live project is configured
    try {
      const url = import.meta.env.VITE_SUPABASE_URL || ''
      if (url && !url.includes('demo-project.supabase.co')) {
        const emailInput = cleanId.includes('@') ? cleanId : `${cleanId}@dominova.in`
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailInput,
          password,
        })
        if (!error && data.user) {
          setUser(data.user)
          setSession(data.session)
          const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
          setProfile(p || DEFAULT_ADMIN_PROFILE)
          return { error: null }
        }
      }
    } catch {
      // ignore
    }

    return { error: 'Invalid username or password. Please verify your credentials and try again.' }
  }

  const signOut = async () => {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    localStorage.removeItem('dominor_active_session')
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const updatePassword = async (newPassword: string): Promise<{ error: string | null }> => {
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY)
      if (stored) {
        const admin: StoredAdmin = JSON.parse(stored)
        const { hash, salt } = await hashPassword(newPassword)
        admin.hash = hash
        admin.salt = salt
        admin.updatedAt = new Date().toISOString()
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin))
      }

      if (session) {
        await supabase.auth.updateUser({ password: newPassword })
      }

      return { error: null }
    } catch {
      return { error: 'Failed to update administrative password.' }
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signOut, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
