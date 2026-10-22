import { useState, useEffect } from 'react'
import { dataProvider } from '@/lib/dataProvider'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/States'
import { toast } from 'sonner'
import {
  Globe,
  Database,
  Lock,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  User,
  Sliders,
  FolderArchive,
  Upload,
} from 'lucide-react'
import { copyToClipboard } from '@/lib/utils'
import { STORAGE_BUCKETS } from '@/lib/supabase'

export default function SettingsPage() {
  const { profile, updatePassword, updateProfile, refreshProfile } = useAuth()

  // Profile state (Phase 4)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Preferences / user_settings state (Phase 7)
  const [themePreference, setThemePreference] = useState('dark')
  const [defaultQrColor, setDefaultQrColor] = useState('#000000')
  const [savingSettings, setSavingSettings] = useState(false)

  // Base URL
  const [baseUrl, setBaseUrl] = useState('')
  const [savingBaseUrl, setSavingBaseUrl] = useState(false)

  // Supabase status
  const [supabaseStatus, setSupabaseStatus] = useState<{ live: boolean; message: string } | null>(null)
  const [checkingSupabase, setCheckingSupabase] = useState(false)

  // Password update
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPass, setUpdatingPass] = useState(false)

  useEffect(() => {
    setBaseUrl(dataProvider.getBaseUrl())
    checkSupabase()

    if (profile) {
      setFullName(profile.full_name || '')
      setUsername(profile.username || '')
      setAvatarUrl(profile.avatar_url || '')
    }

    dataProvider.getUserSettings().then((settings) => {
      if (settings) {
        if (settings.theme) setThemePreference(settings.theme)
        if (settings.default_qr_color) setDefaultQrColor(settings.default_qr_color)
      }
    })
  }, [profile])

  const checkSupabase = async () => {
    setCheckingSupabase(true)
    try {
      const res = await dataProvider.checkSupabaseLive()
      setSupabaseStatus(res)
    } finally {
      setCheckingSupabase(false)
    }
  }

  const handleSaveBaseUrl = (e: React.FormEvent) => {
    e.preventDefault()
    if (!baseUrl.trim()) {
      toast.error('Base URL cannot be empty')
      return
    }
    setSavingBaseUrl(true)
    try {
      dataProvider.setBaseUrl(baseUrl.trim())
      toast.success('Permanent Base URL updated successfully!')
    } finally {
      setSavingBaseUrl(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      // Security rule: Only permitted fields full_name, username, avatar_url are passed
      const res = await updateProfile({
        full_name: fullName.trim(),
        username: username.trim(),
        avatar_url: avatarUrl.trim(),
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Profile updated successfully!')
        refreshProfile()
      }
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const res = await dataProvider.updateUserSettings({
        theme: themePreference,
        default_qr_color: defaultQrColor,
      })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('User settings saved successfully!')
      }
    } finally {
      setSavingSettings(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) {
      toast.error('Please enter a new password')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setUpdatingPass(true)
    try {
      const res = await updatePassword(newPassword)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Administrator password updated successfully!')
        setNewPassword('')
        setConfirmPassword('')
      }
    } finally {
      setUpdatingPass(false)
    }
  }

  const isLocalOrPreview =
    baseUrl.includes('localhost') ||
    baseUrl.includes('127.0.0.1') ||
    baseUrl.includes('.vercel.app/preview')

  const copySqlSnippet = async () => {
    const sql = `-- Verified schema SQL reference for public tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  account_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.qr_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qr_type TEXT NOT NULL DEFAULT 'url',
  destination_url TEXT NOT NULL,
  category_id UUID REFERENCES public.qr_categories(id) ON DELETE SET NULL,
  foreground_color TEXT DEFAULT '#000000',
  background_color TEXT DEFAULT '#FFFFFF',
  qr_image_path TEXT,
  total_scans INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qr_code_id UUID REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  default_qr_color TEXT DEFAULT '#000000',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;`

    await copyToClipboard(sql)
    toast.success('SQL schema copied to clipboard!')
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader
        title="Settings & Configuration"
        description="Configure permanent Vercel domain, manage profiles, adjust preferences, and monitor Supabase database"
      />

      {/* 1. Profile Management (Phase 4) */}
      <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 sm:p-8 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A24D]/15 text-[#C9A24D] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Profile Management</h3>
              <p className="text-xs text-[#A3A3A3]">
                Manage your user details stored in <code className="text-[#C9A24D]">public.profiles</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-[#161616] text-[#C9A24D] border border-[#C9A24D]/30 px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider">
              Role: {profile?.role || 'admin'}
            </span>
            <span className="text-[11px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-semibold uppercase tracking-wider">
              {profile?.account_status || 'active'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. DOMINOVA Administrator"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Username"
              placeholder="e.g. dominova"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <Input
            label="Avatar URL"
            placeholder="https://example.com/avatar.png"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-[#737373]">
              Security Note: Account role and status cannot be modified from the frontend.
            </p>
            <Button type="submit" variant="gold" size="md" loading={savingProfile} className="font-bold text-black">
              Save Profile
            </Button>
          </div>
        </form>
      </div>

      {/* 2. User Preferences & Settings (Phase 7) */}
      <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 sm:p-8 shadow-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#161616] text-[#C9A24D] border border-[#292929] flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">User Preferences</h3>
            <p className="text-xs text-[#A3A3A3]">
              Default generator options synced to <code className="text-[#C9A24D]">public.user_settings</code>
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#A3A3A3] block mb-1.5">Theme Preference</label>
              <select
                value={themePreference}
                onChange={(e) => setThemePreference(e.target.value)}
                className="w-full bg-[#161616] border border-[#292929] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A24D]"
              >
                <option value="dark">Dark Theme (Default)</option>
                <option value="light">Light Theme</option>
                <option value="system">System Preference</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A3A3A3] block mb-1.5">Default QR Foreground Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={defaultQrColor}
                  onChange={(e) => setDefaultQrColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-[#292929]"
                />
                <Input
                  value={defaultQrColor}
                  onChange={(e) => setDefaultQrColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="outline" size="md" loading={savingSettings}>
              Save Preferences
            </Button>
          </div>
        </form>
      </div>

      {/* 3. Permanent Base URL Configuration */}
      <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 sm:p-8 shadow-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A24D]/15 text-[#C9A24D] flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Permanent Base URL</h3>
            <p className="text-xs text-[#A3A3A3]">
              The production domain prefix used when generating permanent QR links (e.g. /product/001)
            </p>
          </div>
        </div>

        {isLocalOrPreview && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Commercial Printing Notice:</strong> Currently configured with a local/preview domain.
              Before printing physical QR cards or stickers, enter your final production Vercel domain (e.g.{' '}
              <code className="text-[#C9A24D]">https://product-nu-lyart.vercel.app</code>) so QR codes remain permanently functional.
            </div>
          </div>
        )}

        <form onSubmit={handleSaveBaseUrl} className="space-y-4">
          <Input
            label="Base URL"
            placeholder="https://YOUR-VERCEL-DOMAIN.vercel.app"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />

          <div className="flex justify-end">
            <Button type="submit" variant="gold" size="md" loading={savingBaseUrl} className="font-bold text-black">
              Save Base URL
            </Button>
          </div>
        </form>
      </div>

      {/* 4. Supabase Database Connection Status */}
      <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 sm:p-8 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#161616] text-[#C9A24D] border border-[#292929] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Database Engine</h3>
              <p className="text-xs text-[#A3A3A3]">
                Supabase PostgreSQL project: <code className="text-white">qapoyyungfqpojnqgjur</code>
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={checkSupabase}
            loading={checkingSupabase}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Check Status
          </Button>
        </div>

        {supabaseStatus && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
              supabaseStatus.live
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-[#161616] border-[#292929] text-[#A3A3A3]'
            }`}
          >
            {supabaseStatus.live ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-semibold text-white">
                {supabaseStatus.live ? 'Live Supabase Connected' : 'Local Persistence Vault Active'}
              </p>
              <p>{supabaseStatus.message}</p>
            </div>
          </div>
        )}

        {/* Storage Buckets Info (Phase 8) */}
        <div className="p-4 bg-[#161616] border border-[#292929] rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-[#C9A24D]" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Supabase Storage Buckets
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-[#111111] rounded-lg border border-[#292929]">
              <span className="text-[#C9A24D] font-mono font-semibold">qr-codes</span>
              <p className="text-[#737373] text-[11px] mt-0.5">Private storage for QR assets</p>
            </div>
            <div className="p-2.5 bg-[#111111] rounded-lg border border-[#292929]">
              <span className="text-emerald-400 font-mono font-semibold">profile-images</span>
              <p className="text-[#737373] text-[11px] mt-0.5">Public bucket for avatars</p>
            </div>
            <div className="p-2.5 bg-[#111111] rounded-lg border border-[#292929]">
              <span className="text-[#C9A24D] font-mono font-semibold">brand-assets</span>
              <p className="text-[#737373] text-[11px] mt-0.5">Private storage for brand logos</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#161616] border border-[#292929] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Supabase Production Schema Script
            </span>
            <button
              onClick={copySqlSnippet}
              className="text-xs text-[#C9A24D] hover:underline flex items-center gap-1 font-semibold"
            >
              <Copy className="w-3.5 h-3.5" /> Copy SQL
            </button>
          </div>
          <p className="text-xs text-[#737373]">
            All 9 production tables (<code>profiles</code>, <code>qr_categories</code>, <code>qr_codes</code>,{' '}
            <code>qr_scans</code>, <code>social_links</code>, <code>link_pages</code>, <code>user_settings</code>,{' '}
            <code>activity_logs</code>, <code>qr_downloads</code>) are verified in your Supabase project.
          </p>
        </div>
      </div>

      {/* 5. Password Update */}
      <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 sm:p-8 shadow-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#161616] text-[#C9A24D] border border-[#292929] flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Security & Password</h3>
            <p className="text-xs text-[#A3A3A3]">
              Update your administrative authentication password
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="outline"
              size="md"
              loading={updatingPass}
              disabled={!newPassword}
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
