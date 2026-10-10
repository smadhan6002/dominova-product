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
} from 'lucide-react'
import { copyToClipboard } from '@/lib/utils'

export default function SettingsPage() {
  const { profile, updatePassword } = useAuth()

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
  }, [])

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
    const sql = `CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id TEXT UNIQUE NOT NULL,
  permanent_url TEXT NOT NULL,
  organization_name TEXT,
  google_reviews_url TEXT,
  instagram_url TEXT,
  website_url TEXT,
  whatsapp_url TEXT,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Assigned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  assigned_at TIMESTAMPTZ
);
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated admins can manage qr_codes" ON public.qr_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public visitors can view qr_codes" ON public.qr_codes FOR SELECT TO anon USING (true);`

    await copyToClipboard(sql)
    toast.success('SQL schema copied to clipboard!')
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader
        title="Settings & Configuration"
        description="Configure permanent Vercel domain, monitor Supabase connection, and manage admin credentials"
      />

      {/* 1. Permanent Base URL Configuration */}
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
              Before printing physical QR cards or stickers, enter your final production Vercel domain (e.g. <code className="text-[#C9A24D]">https://product-nu-lyart.vercel.app</code>) so QR codes remain permanently functional.
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

      {/* 2. Supabase Database Connection Status */}
      <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 sm:p-8 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#161616] text-[#C9A24D] border border-[#292929] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Database Engine</h3>
              <p className="text-xs text-[#A3A3A3]">
                Supabase PostgreSQL single source of truth status
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

        <div className="p-4 bg-[#161616] border border-[#292929] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Supabase SQL Schema Script
            </span>
            <button
              onClick={copySqlSnippet}
              className="text-xs text-[#C9A24D] hover:underline flex items-center gap-1 font-semibold"
            >
              <Copy className="w-3.5 h-3.5" /> Copy SQL
            </button>
          </div>
          <p className="text-xs text-[#737373]">
            To run against your live Supabase project, open your Supabase SQL Editor and execute the schema from <code className="text-[#A3A3A3]">supabase_schema.sql</code>.
          </p>
        </div>
      </div>

      {/* 3. Administrator Credentials */}
      <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 sm:p-8 shadow-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#161616] text-[#C9A24D] border border-[#292929] flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Admin Account</h3>
            <p className="text-xs text-[#A3A3A3]">
              Active account: <strong className="text-white">{profile?.username || 'dominova'}</strong>
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
