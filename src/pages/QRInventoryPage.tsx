import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { dataProvider } from '@/lib/dataProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState, ErrorState, EmptyState, PageHeader } from '@/components/ui/States'
import { copyToClipboard } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Search,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Layers,
  Filter,
  Building2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import type { QRCode } from '@/types/database'
import { ConfigureQRModal } from '@/components/ConfigureQRModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const PAGE_SIZE = 50

export default function QRInventoryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [qrCodes, setQRCodes] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // Configure modal state
  const [selectedQRId, setSelectedQRId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QRCode | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await dataProvider.deleteQRCode(deleteTarget.id)
      if (res.success) {
        toast.success(`QR ${deleteTarget.qr_id || deleteTarget.name} deleted successfully`)
        setDeleteTarget(null)
        fetchQRCodes()
      } else {
        toast.error(res.error || 'Failed to delete QR code')
      }
    } finally {
      setDeleting(false)
    }
  }

  const fetchQRCodes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await dataProvider.getQRCodes({
        search,
        statusFilter,
        page,
        pageSize: PAGE_SIZE,
      })
      setQRCodes(res.qrCodes)
      setTotalCount(res.total)
    } catch (err) {
      console.error('Fetch QR codes error:', err)
      setError('Failed to load QR codes.')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    fetchQRCodes()
  }, [fetchQRCodes])

  // Sync url params
  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (statusFilter !== 'all') params.status = statusFilter
    setSearchParams(params, { replace: true })
  }, [search, statusFilter, setSearchParams])

  const handleCopyUrl = async (qr: QRCode) => {
    const success = await copyToClipboard(qr.permanent_url)
    if (success) {
      setCopiedId(qr.qr_id)
      toast.success(`Copied URL for QR ${qr.qr_id}`)
      setTimeout(() => setCopiedId(null), 2000)
    } else {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleCopyAllVisible = async () => {
    if (qrCodes.length === 0) return
    const lines = qrCodes.map((item) => item.permanent_url).join('\n')
    const success = await copyToClipboard(lines)
    if (success) {
      toast.success(`Copied ${qrCodes.length} URLs to clipboard!`)
    } else {
      toast.error('Failed to copy URLs')
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="QR Inventory"
        description="Search, view, copy links, and assign organizations to permanent QR records"
        action={
          <div className="flex items-center gap-3">
            {qrCodes.length > 0 && (
              <Button
                variant="outline"
                size="md"
                icon={<Copy className="w-4 h-4 text-[#A3A3A3]" />}
                onClick={handleCopyAllVisible}
              >
                Copy All {qrCodes.length} URLs
              </Button>
            )}
            <Button
              variant="gold"
              size="md"
              icon={<Plus className="w-4 h-4 text-black" />}
              onClick={() => navigate('/generate')}
              className="font-bold shadow-[0_0_20px_rgba(201,162,77,0.3)] text-black"
            >
              Generate QR Codes
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-[#111111] border border-[#292929] rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-card">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Search by QR ID (001), URL, or Organization..."
            className="pl-10"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 self-stretch md:self-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => {
              setStatusFilter('all')
              setPage(0)
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#C9A24D] text-black shadow-[0_0_10px_rgba(201,162,77,0.3)]'
                : 'bg-[#161616] text-[#A3A3A3] hover:text-white border border-[#292929]'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => {
              setStatusFilter('available')
              setPage(0)
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'available'
                ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-[#161616] text-[#A3A3A3] hover:text-white border border-[#292929]'
            }`}
          >
            Available
          </button>
          <button
            onClick={() => {
              setStatusFilter('assigned')
              setPage(0)
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === 'assigned'
                ? 'bg-[#C9A24D] text-black shadow-[0_0_10px_rgba(201,162,77,0.3)]'
                : 'bg-[#161616] text-[#A3A3A3] hover:text-white border border-[#292929]'
            }`}
          >
            Assigned
          </button>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <LoadingState message="Loading QR code inventory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchQRCodes} />
      ) : qrCodes.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title={search || statusFilter !== 'all' ? 'No QR records match your search' : 'No QR codes generated yet'}
          description={
            search || statusFilter !== 'all'
              ? 'Try modifying your search term or clearing the status filter.'
              : 'Generate permanent QR codes in bulk to get started.'
          }
          action={
            !search && statusFilter === 'all' ? (
              <Button
                variant="gold"
                icon={<Plus className="w-4 h-4 text-black" />}
                onClick={() => navigate('/generate')}
                className="font-bold text-black"
              >
                Generate First Batch
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-[#111111] border border-[#292929] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#161616] text-[#A3A3A3] text-xs uppercase tracking-wider border-b border-[#292929]">
                <tr>
                  <th className="py-4 px-5 font-semibold">QR ID</th>
                  <th className="py-4 px-5 font-semibold">Permanent URL</th>
                  <th className="py-4 px-5 font-semibold">Status</th>
                  <th className="py-4 px-5 font-semibold">Organization Name</th>
                  <th className="py-4 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292929]/70 bg-[#111111]">
                {qrCodes.map((qr) => {
                  const isCopied = copiedId === qr.qr_id
                  const isAssigned = Boolean(
                    qr.organization_name &&
                    !qr.organization_name.startsWith('QR-') &&
                    !qr.organization_name.match(/^\d+$/)
                  )

                  return (
                    <tr key={qr.id} className="hover:bg-[#161616]/60 transition-colors">
                      {/* QR ID */}
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-white text-base tracking-wide">
                          {qr.qr_id}
                        </span>
                      </td>

                      {/* Permanent URL */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 max-w-md">
                          <span className="font-mono text-xs text-[#A3A3A3] truncate select-all">
                            {qr.permanent_url}
                          </span>
                          <a
                            href={qr.permanent_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-[#737373] hover:text-[#C9A24D] transition-colors flex-shrink-0"
                            title="Open public URL"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isAssigned
                              ? 'bg-[#C9A24D]/15 text-[#C9A24D] border border-[#C9A24D]/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isAssigned ? 'Assigned' : qr.status === 'active' ? 'Available' : qr.status}
                        </span>
                      </td>

                      {/* Organization Name */}
                      <td className="py-4 px-5">
                        {qr.organization_name ? (
                          <div className="flex items-center gap-2 font-medium text-white">
                            <Building2 className="w-4 h-4 text-[#C9A24D]" />
                            <span>{qr.organization_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#737373] italic">Unassigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(qr)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161616] border border-[#292929] text-xs text-white hover:border-[#C9A24D] hover:text-[#C9A24D] transition-colors font-medium"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                          </button>

                          {/* Assign / Edit Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedQRId(qr.qr_id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                              isAssigned
                                ? 'bg-[#161616] border border-[#C9A24D]/40 text-[#C9A24D] hover:bg-[#C9A24D]/15'
                                : 'bg-[#C9A24D] text-black hover:bg-[#D4AF37] shadow-[0_0_10px_rgba(201,162,77,0.25)]'
                            }`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{isAssigned ? 'Edit' : 'Assign'}</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(qr)}
                            className="p-1.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete QR record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[#292929] flex items-center justify-between text-xs text-[#A3A3A3]">
              <div>
                Showing page <strong className="text-white">{page + 1}</strong> of{' '}
                <strong className="text-white">{totalPages}</strong> ({totalCount} total QR codes)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-[#292929] disabled:opacity-40 hover:bg-[#161616] text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-[#292929] disabled:opacity-40 hover:bg-[#161616] text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configure QR Modal */}
      {selectedQRId && (
        <ConfigureQRModal
          open={Boolean(selectedQRId)}
          qrId={selectedQRId}
          onClose={() => setSelectedQRId(null)}
          onSuccess={() => {
            fetchQRCodes()
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete QR Code Record"
        description={`Are you sure you want to delete QR ${deleteTarget?.qr_id || deleteTarget?.name}? This action will permanently remove the record from your database.`}
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
