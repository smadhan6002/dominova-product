import React, { useEffect, useState } from 'react'
import { dataProvider } from '@/lib/dataProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { copyToClipboard, isValidUrl, normalizeWhatsAppUrl } from '@/lib/utils'
import { toast } from 'sonner'
import {
  QrCode,
  Copy,
  Check,
  Building2,
  Star,
  Instagram,
  Globe,
  MessageCircle,
  X,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import type { QRCode } from '@/types/database'

interface ConfigureQRModalProps {
  open: boolean
  qrId: string | null
  onClose: () => void
  onSuccess: (updated: QRCode) => void
}

export function ConfigureQRModal({ open, qrId, onClose, onSuccess }: ConfigureQRModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [qrRecord, setQrRecord] = useState<QRCode | null>(null)
  const [copied, setCopied] = useState(false)

  // Form fields
  const [organizationName, setOrganizationName] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [googleReviewsUrl, setGoogleReviewsUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [whatsappUrl, setWhatsappUrl] = useState('')

  // Validation errors
  const [errors, setErrors] = useState<{
    organizationName?: string
    googleReviewsUrl?: string
    instagramUrl?: string
    websiteUrl?: string
    whatsappUrl?: string
  }>({})

  useEffect(() => {
    if (!open || !qrId) {
      setQrRecord(null)
      return
    }

    const loadData = async () => {
      setLoading(true)
      setErrors({})
      try {
        const [record, cats] = await Promise.all([
          dataProvider.getQRCodeByQRId(qrId),
          dataProvider.getCategories(),
        ])
        setCategories(cats)
        if (record) {
          setQrRecord(record)
          setOrganizationName(record.organization_name || '')
          setCategoryId(record.category_id || '')
          setGoogleReviewsUrl(record.google_reviews_url || '')
          setInstagramUrl(record.instagram_url || '')
          setWebsiteUrl(record.website_url || '')
          setWhatsappUrl(record.whatsapp_url || '')
        } else {
          toast.error(`QR Code ${qrId} not found in inventory.`)
          onClose()
        }
      } catch (err) {
        toast.error('Failed to load QR code details.')
        onClose()
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [open, qrId, onClose])

  if (!open || !qrId) return null

  const handleCopy = async () => {
    if (!qrRecord) return
    const ok = await copyToClipboard(qrRecord.permanent_url)
    if (ok) {
      setCopied(true)
      toast.success('Permanent URL copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error('Failed to copy link')
    }
  }

  const validate = () => {
    const newErrors: typeof errors = {}

    if (!organizationName.trim()) {
      newErrors.organizationName = 'Organization Name is required'
    }

    if (googleReviewsUrl.trim() && !isValidUrl(googleReviewsUrl)) {
      newErrors.googleReviewsUrl = 'Must be a valid HTTP or HTTPS address (e.g. https://g.page/...)'
    }

    if (instagramUrl.trim() && !isValidUrl(instagramUrl)) {
      newErrors.instagramUrl = 'Must be a valid HTTP or HTTPS address (e.g. https://instagram.com/...)'
    }

    if (websiteUrl.trim() && !isValidUrl(websiteUrl)) {
      newErrors.websiteUrl = 'Must be a valid HTTP or HTTPS address (e.g. https://example.com)'
    }

    if (whatsappUrl.trim() && !isValidUrl(normalizeWhatsAppUrl(whatsappUrl))) {
      newErrors.whatsappUrl = 'Must be a valid WhatsApp link (e.g. https://wa.me/919876543210)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const normalizedWA = whatsappUrl.trim() ? normalizeWhatsAppUrl(whatsappUrl) : null

      const res = await dataProvider.configureQRCode(qrId, {
        organization_name: organizationName.trim(),
        category_id: categoryId || null,
        google_reviews_url: googleReviewsUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        whatsapp_url: normalizedWA,
      })

      if (res.success && res.qrCode) {
        toast.success(`Successfully assigned QR ${qrId} to ${organizationName.trim()}!`)
        onSuccess(res.qrCode)
        onClose()
      } else {
        toast.error(res.error || 'Failed to save configuration.')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  const isConfigured = Boolean(
    qrRecord?.organization_name &&
    !qrRecord?.organization_name.startsWith('QR-') &&
    !qrRecord?.organization_name.match(/^\d+$/)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#111111] border border-[#292929] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-[#292929] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C9A24D]/15 border border-[#C9A24D]/30 rounded-xl flex items-center justify-center text-[#C9A24D]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isConfigured ? 'Edit Existing QR Code' : 'Assign QR Code'}
              </h2>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Configure business identity and destination buttons for physical QR #{qrId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#161616] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#A3A3A3] space-y-3">
            <div className="w-8 h-8 border-2 border-[#C9A24D] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading QR configuration...</p>
          </div>
        ) : !qrRecord ? (
          <div className="p-8 text-center text-[#A3A3A3]">QR Code not found.</div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-6">
            {/* Section A: Permanent QR Information */}
            <div className="p-4 bg-[#161616] border border-[#292929] rounded-xl space-y-3">
              <div className="text-xs uppercase font-bold text-[#C9A24D] tracking-wider">
                Section A — Permanent QR Information
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="font-mono text-2xl font-black text-white">{qrRecord.qr_id}</div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      isConfigured
                        ? 'bg-[#C9A24D]/15 text-[#C9A24D] border border-[#C9A24D]/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isConfigured ? 'Assigned' : 'Available'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111] border border-[#292929] text-xs text-white hover:border-[#C9A24D] hover:text-[#C9A24D] transition-colors font-medium"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={qrRecord.permanent_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-[#111111] border border-[#292929] text-[#A3A3A3] hover:text-white transition-colors"
                    title="Open public page"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="pt-1">
                <div className="text-[11px] text-[#737373] uppercase tracking-wider mb-1">Permanent Public URL</div>
                <div className="font-mono text-xs text-[#A3A3A3] bg-[#111111] px-3 py-2 rounded-lg border border-[#292929] select-all break-all">
                  {qrRecord.permanent_url}
                </div>
                <p className="text-[11px] text-[#737373] mt-1">
                  This permanent link will never change, ensuring physical printed QR codes remain permanently functional.
                </p>
              </div>
            </div>

            {/* Section B: Organization Name */}
            <div className="space-y-2">
              <div className="text-xs uppercase font-bold text-[#C9A24D] tracking-wider">
                Section B — Organization Name
              </div>
              <Input
                label="Organization Name *"
                placeholder="e.g. ABC Salon, The Golden Bistro, Royal Dental Clinic"
                value={organizationName}
                onChange={(e) => {
                  setOrganizationName(e.target.value)
                  if (errors.organizationName) setErrors((prev) => ({ ...prev, organizationName: undefined }))
                }}
                error={errors.organizationName}
                icon={<Building2 className="w-4 h-4 text-[#A3A3A3]" />}
                autoFocus
              />

              {categories.length > 0 && (
                <div className="pt-2">
                  <label className="text-xs font-semibold text-[#A3A3A3] block mb-1.5">Category (Optional)</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-[#161616] border border-[#292929] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A24D]"
                  >
                    <option value="">No Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-xs text-[#737373]">
                This organization name will be prominently displayed as the heading on the public landing page.
              </p>
            </div>

            {/* Section C: Four Destination Links */}
            <div className="space-y-4 pt-2">
              <div className="text-xs uppercase font-bold text-[#C9A24D] tracking-wider">
                Section C — Four Destination Links
              </div>
              <p className="text-xs text-[#A3A3A3] -mt-2">
                Paste the destination links provided by the client. Any blank links will be hidden on the landing page.
              </p>

              <div className="space-y-3.5">
                <Input
                  label="1. Google Reviews URL"
                  placeholder="https://g.page/r/your-business/review"
                  value={googleReviewsUrl}
                  onChange={(e) => {
                    setGoogleReviewsUrl(e.target.value)
                    if (errors.googleReviewsUrl) setErrors((prev) => ({ ...prev, googleReviewsUrl: undefined }))
                  }}
                  error={errors.googleReviewsUrl}
                  icon={<Star className="w-4 h-4 text-amber-400" />}
                />

                <Input
                  label="2. Instagram URL"
                  placeholder="https://instagram.com/yourbusiness"
                  value={instagramUrl}
                  onChange={(e) => {
                    setInstagramUrl(e.target.value)
                    if (errors.instagramUrl) setErrors((prev) => ({ ...prev, instagramUrl: undefined }))
                  }}
                  error={errors.instagramUrl}
                  icon={<Instagram className="w-4 h-4 text-pink-400" />}
                />

                <Input
                  label="3. Website URL"
                  placeholder="https://yourbusiness.com"
                  value={websiteUrl}
                  onChange={(e) => {
                    setWebsiteUrl(e.target.value)
                    if (errors.websiteUrl) setErrors((prev) => ({ ...prev, websiteUrl: undefined }))
                  }}
                  error={errors.websiteUrl}
                  icon={<Globe className="w-4 h-4 text-blue-400" />}
                />

                <Input
                  label="4. WhatsApp URL"
                  placeholder="https://wa.me/919876543210 or 919876543210"
                  value={whatsappUrl}
                  onChange={(e) => {
                    setWhatsappUrl(e.target.value)
                    if (errors.whatsappUrl) setErrors((prev) => ({ ...prev, whatsappUrl: undefined }))
                  }}
                  error={errors.whatsappUrl}
                  icon={<MessageCircle className="w-4 h-4 text-emerald-400" />}
                />
              </div>
            </div>

            {/* Section D: Save */}
            <div className="pt-4 border-t border-[#292929] flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-[#292929] text-sm text-[#A3A3A3] hover:text-white hover:bg-[#161616] transition-colors"
              >
                Cancel
              </button>

              <Button
                type="submit"
                variant="gold"
                size="lg"
                loading={saving}
                className="font-bold px-8 shadow-[0_0_20px_rgba(201,162,77,0.3)]"
              >
                Save Configuration
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
