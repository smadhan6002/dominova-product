import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dataProvider } from '@/lib/dataProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/States'
import { formatQRId, buildPermanentUrl, copyToClipboard } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Layers,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  QrCode,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import type { QRCode } from '@/types/database'
import { ConfigureQRModal } from '@/components/ConfigureQRModal'

export default function BulkGeneratePage() {
  const navigate = useNavigate()

  // Form Inputs
  const [startingNumberInput, setStartingNumberInput] = useState('001')
  const [quantityInput, setQuantityInput] = useState('50')
  const [baseUrlInput, setBaseUrlInput] = useState('')

  // State
  const [generating, setGenerating] = useState(false)
  const [conflictWarning, setConflictWarning] = useState<{
    conflicts: string[]
    nextStart: number
  } | null>(null)

  // Generated Result
  const [generatedBatch, setGeneratedBatch] = useState<QRCode[]>([])
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedIndividualId, setCopiedIndividualId] = useState<string | null>(null)

  // Configure modal for instant assignment
  const [configModalQRId, setConfigModalQRId] = useState<string | null>(null)

  useEffect(() => {
    setBaseUrlInput(dataProvider.getBaseUrl())
  }, [])

  const parsedStart = parseInt(startingNumberInput, 10) || 1
  const parsedQuantity = parseInt(quantityInput, 10) || 50
  const endNumber = parsedStart + parsedQuantity - 1
  const startIdFormatted = formatQRId(parsedStart)
  const endIdFormatted = formatQRId(endNumber)

  const isLocalOrPreview =
    baseUrlInput.includes('localhost') ||
    baseUrlInput.includes('127.0.0.1') ||
    baseUrlInput.includes('.vercel.app/preview')

  // Check for range conflicts when inputs change
  useEffect(() => {
    let active = true
    const checkConflicts = async () => {
      if (parsedQuantity <= 0) return
      try {
        const check = await dataProvider.checkRangeAvailability(parsedStart, parsedQuantity)
        if (active) {
          if (!check.available) {
            setConflictWarning({
              conflicts: check.conflictingIds,
              nextStart: check.nextAvailableStart,
            })
          } else {
            setConflictWarning(null)
          }
        }
      } catch (err) {
        console.warn('Range check error:', err)
      }
    }

    const timer = setTimeout(checkConflicts, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [parsedStart, parsedQuantity])

  const handleUseNextFreeNumber = () => {
    if (conflictWarning) {
      setStartingNumberInput(formatQRId(conflictWarning.nextStart))
      setConflictWarning(null)
      toast.info(`Updated starting number to ${formatQRId(conflictWarning.nextStart)}`)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (parsedQuantity < 1) {
      toast.error('Number of QR codes must be at least 1')
      return
    }

    if (parsedQuantity > 500) {
      toast.error('Maximum 500 QR codes can be generated in a single batch')
      return
    }

    if (!baseUrlInput.trim()) {
      toast.error('Permanent Base URL is required')
      return
    }

    setGenerating(true)
    try {
      // Save current base URL to settings for permanence
      dataProvider.setBaseUrl(baseUrlInput.trim())

      const res = await dataProvider.generateBulkQR({
        startNumber: parsedStart,
        quantity: parsedQuantity,
        baseUrl: baseUrlInput.trim(),
      })

      if (res.success && res.qrCodes.length > 0) {
        toast.success(
          `Successfully generated and saved ${res.qrCodes.length} QR codes (${res.qrCodes[0].qr_id} to ${res.qrCodes[res.qrCodes.length - 1].qr_id})!`
        )
        setGeneratedBatch(res.qrCodes)
        // Auto-increment the input for next generation
        setStartingNumberInput(formatQRId(endNumber + 1))
      } else {
        toast.error(res.error || 'Failed to generate QR batch.')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred during generation.')
    } finally {
      setGenerating(false)
    }
  }

  // Copy All URLs: one URL per line
  const handleCopyAllUrls = async () => {
    if (generatedBatch.length === 0) return

    const lines = generatedBatch.map((item) => item.permanent_url).join('\n')
    const success = await copyToClipboard(lines)

    if (success) {
      setCopiedAll(true)
      toast.success(`Copied all ${generatedBatch.length} permanent URLs to clipboard!`)
      setTimeout(() => setCopiedAll(false), 2500)
    } else {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Copy Individual URL
  const handleCopyIndividual = async (qr: QRCode) => {
    const success = await copyToClipboard(qr.permanent_url)
    if (success) {
      setCopiedIndividualId(qr.qr_id)
      toast.success(`Copied URL for QR ${qr.qr_id}`)
      setTimeout(() => setCopiedIndividualId(null), 2000)
    } else {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <PageHeader
        title="Bulk QR URL Generation"
        description="Pre-generate permanent QR URLs in bulk before assigning clients. Copy and print physical QR codes in advance."
        action={
          <Button
            variant="outline"
            size="md"
            icon={<QrCode className="w-4 h-4 text-[#C9A24D]" />}
            onClick={() => navigate('/qr-inventory')}
          >
            View QR Inventory
          </Button>
        }
      />

      {/* Production Domain Notice */}
      {isLocalOrPreview && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3.5 text-amber-300 text-sm animate-fade-in">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Permanent URL Safety Notice</p>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              You are currently generating URLs using a local or preview domain (<code className="text-white bg-black/40 px-1 py-0.5 rounded">{baseUrlInput}</code>).
              For commercial physical QR printing, please ensure you enter your deployed production Vercel domain below so printed codes remain permanently functional.
            </p>
          </div>
        </div>
      )}

      {/* Generation Form Card */}
      <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 sm:p-8 shadow-2xl">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Starting Number */}
            <div>
              <Input
                label="Starting Number"
                type="text"
                placeholder="001"
                value={startingNumberInput}
                onChange={(e) => setStartingNumberInput(e.target.value)}
                required
              />
              <p className="text-xs text-[#737373] mt-1.5">
                Default: <strong className="text-[#A3A3A3]">001</strong>. Three-digit format is preserved below 100.
              </p>
            </div>

            {/* Number of QR Codes */}
            <div>
              <Input
                label="Number of QR Codes"
                type="number"
                min={1}
                max={500}
                placeholder="50"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                required
              />
              <p className="text-xs text-[#737373] mt-1.5">
                Default: <strong className="text-[#A3A3A3]">50</strong>. Number of sequential QR records to generate.
              </p>
            </div>
          </div>

          {/* Permanent Base URL */}
          <div>
            <Input
              label="Permanent Base URL"
              type="text"
              placeholder="https://YOUR-VERCEL-DOMAIN.vercel.app/product/"
              value={baseUrlInput}
              onChange={(e) => setBaseUrlInput(e.target.value)}
              required
            />
            <p className="text-xs text-[#737373] mt-1.5">
              The public domain used to construct permanent URLs ending in <code className="text-[#C9A24D]">/product/001</code>.
            </p>
          </div>

          {/* Range Preview Badge */}
          <div className="p-4 bg-[#161616] border border-[#292929] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[#737373] uppercase tracking-wider font-semibold">Planned Batch Range:</span>
              <div className="text-sm font-mono font-bold text-white mt-0.5">
                {startIdFormatted} &rarr; {endIdFormatted} ({parsedQuantity} unique records)
              </div>
              <div className="text-[11px] text-[#A3A3A3] mt-1 font-mono break-all">
                Example: {buildPermanentUrl(baseUrlInput, startIdFormatted)}
              </div>
            </div>

            {conflictWarning && (
              <div className="flex flex-col items-start sm:items-end gap-1.5">
                <span className="text-red-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Conflict: {conflictWarning.conflicts.length} ID(s) already exist
                </span>
                <button
                  type="button"
                  onClick={handleUseNextFreeNumber}
                  className="text-xs bg-[#C9A24D]/20 text-[#C9A24D] px-2.5 py-1 rounded-md border border-[#C9A24D]/40 hover:bg-[#C9A24D]/30 transition-colors font-semibold"
                >
                  Set to Next Free: {formatQRId(conflictWarning.nextStart)}
                </button>
              </div>
            )}
          </div>

          {/* Conflict Alert Box if present */}
          {conflictWarning && (
            <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-300 space-y-1">
              <p className="font-bold text-white">Range Conflict Detected</p>
              <p>
                The following IDs are already in the database: <span className="font-mono text-red-400 font-bold">{conflictWarning.conflicts.slice(0, 8).join(', ')}{conflictWarning.conflicts.length > 8 ? '...' : ''}</span>.
                The system will not overwrite existing records. Please change the starting number or click above to use the next available start.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="gold"
              size="lg"
              loading={generating}
              disabled={generating || Boolean(conflictWarning)}
              icon={<Layers className="w-5 h-5 text-black" />}
              className="font-bold px-8 shadow-[0_0_20px_rgba(201,162,77,0.3)] text-base"
            >
              Generate QR URLs
            </Button>
          </div>
        </form>
      </div>

      {/* Generated Batch Section */}
      {generatedBatch.length > 0 && (
        <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#292929]">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xl font-bold text-white">
                  Successfully Generated {generatedBatch.length} Permanent QR URLs
                </h3>
              </div>
              <p className="text-xs text-[#A3A3A3] mt-1">
                Permanent records are saved in the database. Copy all URLs at once to paste into your physical QR printer or generator.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="gold"
                size="md"
                onClick={handleCopyAllUrls}
                icon={copiedAll ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                className="font-bold shadow-[0_0_20px_rgba(201,162,77,0.3)] text-black"
              >
                {copiedAll ? 'Copied All URLs!' : 'Copy All URLs'}
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={() => navigate('/qr-inventory')}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Go to Inventory
              </Button>
            </div>
          </div>

          {/* URLs Preview Table */}
          <div className="overflow-x-auto rounded-xl border border-[#292929]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#161616] text-[#A3A3A3] text-xs uppercase tracking-wider border-b border-[#292929]">
                <tr>
                  <th className="py-3 px-4 font-semibold">QR ID</th>
                  <th className="py-3 px-4 font-semibold">Permanent URL</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292929]/70 bg-[#111111]">
                {generatedBatch.map((item) => {
                  const isCopied = copiedIndividualId === item.qr_id
                  return (
                    <tr key={item.id} className="hover:bg-[#161616]/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#C9A24D]">
                        {item.qr_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#A3A3A3] select-all">
                        {item.permanent_url}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyIndividual(item)}
                            className="px-2.5 py-1 rounded-lg bg-[#161616] border border-[#292929] text-xs text-white hover:border-[#C9A24D] hover:text-[#C9A24D] transition-colors flex items-center gap-1 font-medium"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfigModalQRId(item.qr_id)}
                            className="px-2.5 py-1 rounded-lg bg-[#C9A24D]/15 border border-[#C9A24D]/30 text-xs text-[#C9A24D] hover:bg-[#C9A24D]/25 transition-colors font-semibold"
                          >
                            Assign
                          </button>

                          <a
                            href={item.permanent_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-[#737373] hover:text-white transition-colors"
                            title="Open link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Instant Configuration Modal */}
      {configModalQRId && (
        <ConfigureQRModal
          open={Boolean(configModalQRId)}
          qrId={configModalQRId}
          onClose={() => setConfigModalQRId(null)}
          onSuccess={(updated) => {
            // Update in local list
            setGeneratedBatch((prev) =>
              prev.map((item) => (item.qr_id === updated.qr_id ? updated : item))
            )
          }}
        />
      )}
    </div>
  )
}
