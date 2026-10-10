import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dataProvider } from '@/lib/dataProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState, ErrorState, PageHeader } from '@/components/ui/States'
import { copyToClipboard } from '@/lib/utils'
import { toast } from 'sonner'
import {
  QrCode,
  CheckCircle,
  Layers,
  Building2,
  Plus,
  ArrowRight,
  Copy,
  Check,
  Edit2,
  ExternalLink,
  Sparkles,
  Search,
} from 'lucide-react'
import type { DashboardStats, QRCode } from '@/types/database'
import { ConfigureQRModal } from '@/components/ConfigureQRModal'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentQRs, setRecentQRs] = useState<QRCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quick jump by QR ID
  const [quickQRId, setQuickQRId] = useState('')
  const [configModalQRId, setConfigModalQRId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, qrData] = await Promise.all([
        dataProvider.getDashboardStats(),
        dataProvider.getQRCodes({ page: 0, pageSize: 8 }),
      ])
      setStats(statsData)
      setRecentQRs(qrData.qrCodes)
    } catch (err) {
      console.error('Dashboard data error:', err)
      setError('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleCopyUrl = async (qr: QRCode) => {
    const success = await copyToClipboard(qr.permanent_url)
    if (success) {
      setCopiedId(qr.qr_id)
      toast.success(`Copied URL for QR ${qr.qr_id}`)
      setTimeout(() => setCopiedId(null), 2000)
    } else {
      toast.error('Failed to copy')
    }
  }

  const handleQuickJump = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickQRId.trim()) return

    const record = await dataProvider.getQRCodeByQRId(quickQRId.trim())
    if (record) {
      setConfigModalQRId(record.qr_id)
      setQuickQRId('')
    } else {
      toast.error(`QR Code ${quickQRId.trim()} not found in inventory. You can generate it first.`)
    }
  }

  if (loading) return <LoadingState message="Loading system overview..." />
  if (error) return <ErrorState message={error} onRetry={fetchDashboardData} />

  const summaryCards = [
    {
      title: 'Total QR Codes',
      value: stats?.totalQRCodes || 0,
      description: 'Total permanent records',
      icon: QrCode,
      color: 'text-white',
      accentBg: 'bg-[#161616]',
      route: '/qr-inventory',
    },
    {
      title: 'Available QR Codes',
      value: stats?.availableQRCodes || 0,
      description: 'In stock, ready to assign',
      icon: Layers,
      color: 'text-emerald-400',
      accentBg: 'bg-emerald-500/10',
      route: '/qr-inventory?status=available',
    },
    {
      title: 'Assigned QR Codes',
      value: stats?.assignedQRCodes || 0,
      description: 'Active with business profiles',
      icon: CheckCircle,
      color: 'text-[#C9A24D]',
      accentBg: 'bg-[#C9A24D]/10',
      route: '/qr-inventory?status=assigned',
    },
    {
      title: 'Total Organizations',
      value: stats?.totalOrganizations || 0,
      description: 'Unique businesses enrolled',
      icon: Building2,
      color: 'text-amber-400',
      accentBg: 'bg-amber-500/10',
      route: '/qr-inventory?status=assigned',
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        description="Immediate overview of permanent QR inventory, available stock, and assigned businesses"
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              icon={<QrCode className="w-4 h-4 text-[#A3A3A3]" />}
              onClick={() => navigate('/qr-inventory')}
            >
              View Inventory
            </Button>
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

      {/* 4 Database-Calculated Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            onClick={() => navigate(card.route)}
            className="bg-[#111111] border border-[#292929] hover:border-[#C9A24D]/40 rounded-2xl p-6 transition-all duration-200 cursor-pointer shadow-card group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider">
                  {card.title}
                </p>
                <p className="text-3xl font-extrabold text-white mt-2 tracking-tight group-hover:text-[#C9A24D] transition-colors">
                  {card.value}
                </p>
                <p className="text-xs text-[#737373] mt-1">{card.description}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.accentBg} ${card.color} flex-shrink-0`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Primary Quick Actions Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action 1: Generate QR Codes */}
        <div
          onClick={() => navigate('/generate')}
          className="bg-gradient-to-br from-[#111111] to-[#161616] border border-[#292929] hover:border-[#C9A24D]/60 rounded-2xl p-6 cursor-pointer transition-all shadow-card group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 bg-[#C9A24D] rounded-xl flex items-center justify-center text-black mb-4 shadow-[0_0_15px_rgba(201,162,77,0.3)]">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-[#C9A24D] transition-colors">
              1. Generate QR Codes
            </h3>
            <p className="text-xs text-[#A3A3A3] mt-1.5 leading-relaxed">
              Create permanent sequential QR URLs in bulk (e.g. 001–050). Copy all URLs to print physical QR stickers in advance.
            </p>
          </div>
          <div className="pt-5 flex items-center gap-2 text-xs font-bold text-[#C9A24D]">
            <span>Start Bulk Generation</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Action 2: View QR Inventory */}
        <div
          onClick={() => navigate('/qr-inventory')}
          className="bg-gradient-to-br from-[#111111] to-[#161616] border border-[#292929] hover:border-[#C9A24D]/60 rounded-2xl p-6 cursor-pointer transition-all shadow-card group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 bg-[#161616] border border-[#292929] rounded-xl flex items-center justify-center text-[#C9A24D] mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-[#C9A24D] transition-colors">
              2. View QR Inventory
            </h3>
            <p className="text-xs text-[#A3A3A3] mt-1.5 leading-relaxed">
              Search, filter available vs assigned stock, copy individual permanent URLs, and review all issued physical QR codes.
            </p>
          </div>
          <div className="pt-5 flex items-center gap-2 text-xs font-bold text-[#C9A24D]">
            <span>Browse All Inventory</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Action 3: Assign or Edit QR Direct Jump */}
        <div className="bg-gradient-to-br from-[#111111] to-[#161616] border border-[#292929] rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-[#161616] border border-[#292929] rounded-xl flex items-center justify-center text-emerald-400 mb-4">
              <Edit2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">
              3. Assign or Edit QR
            </h3>
            <p className="text-xs text-[#A3A3A3] mt-1.5 leading-relaxed">
              Enter an existing QR ID to configure the organization name and its four destination links.
            </p>
          </div>

          <form onSubmit={handleQuickJump} className="pt-4 flex items-center gap-2">
            <Input
              placeholder="QR ID (e.g. 001)"
              value={quickQRId}
              onChange={(e) => setQuickQRId(e.target.value)}
              className="text-xs py-2"
            />
            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={!quickQRId.trim()}
              className="text-xs font-bold text-black flex-shrink-0"
            >
              Open
            </Button>
          </form>
        </div>
      </div>

      {/* Recent QR Records */}
      <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#292929]">
          <div>
            <h3 className="text-base font-bold text-white">Recent QR Inventory</h3>
            <p className="text-xs text-[#A3A3A3]">Quick access to permanent QR records and destination links</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/qr-inventory')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            View All ({stats?.totalQRCodes || 0})
          </Button>
        </div>

        {recentQRs.length === 0 ? (
          <div className="py-12 text-center text-[#737373] text-sm">
            <QrCode className="w-8 h-8 mx-auto mb-2 text-[#292929]" />
            No QR records in database. Click &ldquo;Generate QR Codes&rdquo; to create your first batch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#161616] text-[#A3A3A3] text-xs uppercase tracking-wider border-b border-[#292929]">
                <tr>
                  <th className="py-3 px-4 font-semibold">QR ID</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Organization Name</th>
                  <th className="py-3 px-4 font-semibold">Permanent URL</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292929]/70 bg-[#111111]">
                {recentQRs.map((qr) => {
                  const isCopied = copiedId === qr.qr_id
                  const isAssigned = qr.status === 'Assigned'
                  return (
                    <tr key={qr.id} className="hover:bg-[#161616]/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {qr.qr_id}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            isAssigned
                              ? 'bg-[#C9A24D]/15 text-[#C9A24D] border border-[#C9A24D]/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {qr.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-white">
                        {qr.organization_name || <span className="text-[#737373] italic">Unassigned</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#A3A3A3]">
                        <span className="truncate max-w-xs block">{qr.permanent_url}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(qr)}
                            className="px-2.5 py-1 rounded-lg bg-[#161616] border border-[#292929] text-xs text-white hover:text-[#C9A24D] transition-colors"
                          >
                            {isCopied ? 'Copied' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfigModalQRId(qr.qr_id)}
                            className="px-2.5 py-1 rounded-lg bg-[#C9A24D]/15 border border-[#C9A24D]/30 text-xs text-[#C9A24D] font-semibold hover:bg-[#C9A24D]/25 transition-colors"
                          >
                            {isAssigned ? 'Edit' : 'Assign'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Configure QR Modal */}
      {configModalQRId && (
        <ConfigureQRModal
          open={Boolean(configModalQRId)}
          qrId={configModalQRId}
          onClose={() => setConfigModalQRId(null)}
          onSuccess={() => {
            fetchDashboardData()
          }}
        />
      )}
    </div>
  )
}
