import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { dataProvider } from '@/lib/dataProvider'
import { Star, Instagram, Globe, MessageCircle, ExternalLink, AlertCircle, Clock } from 'lucide-react'

interface PublicQRState {
  status: 'loading' | 'available' | 'assigned' | 'not_found'
  qrId: string
  organizationName?: string | null
  googleReviewsUrl?: string | null
  instagramUrl?: string | null
  websiteUrl?: string | null
  whatsappUrl?: string | null
}

export default function PublicLandingPage() {
  const params = useParams()
  // Support both :id and :qrCodeId route parameters
  const routeId = params.id || params.qrCodeId || ''

  const [state, setState] = useState<PublicQRState>({
    status: 'loading',
    qrId: routeId,
  })

  useEffect(() => {
    async function loadData() {
      if (!routeId) {
        setState({ status: 'not_found', qrId: '' })
        return
      }

      try {
        const res = await dataProvider.getPublicQRData(routeId)
        if (res.status === 'not_found') {
          setState({ status: 'not_found', qrId: routeId })
        } else if (res.status === 'Available') {
          setState({ status: 'available', qrId: res.qr_id })
        } else if (res.status === 'Assigned') {
          setState({
            status: 'assigned',
            qrId: res.qr_id,
            organizationName: res.organization_name,
            googleReviewsUrl: res.google_reviews_url,
            instagramUrl: res.instagram_url,
            websiteUrl: res.website_url,
            whatsappUrl: res.whatsapp_url,
          })
        } else {
          setState({ status: 'not_found', qrId: routeId })
        }
      } catch (err) {
        console.error('Public landing page fetch error:', err)
        setState({ status: 'not_found', qrId: routeId })
      }
    }

    loadData()
  }, [routeId])

  // 1. Loading State
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-2 border-[#C9A24D] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#A3A3A3] text-xs tracking-wider uppercase font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // 2. Invalid QR ID State
  if (state.status === 'not_found') {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-[#111111] border border-[#292929] rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">QR Code Not Found</h1>
            <p className="text-xs text-[#A3A3A3] mt-2 leading-relaxed">
              The requested QR code identifier is not registered in the system.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 3. Unassigned / Not Activated State (Screen 11 - Before Assignment)
  if (state.status === 'available') {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-[#111111] border border-[#292929] rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#C9A24D]/15 border border-[#C9A24D]/30 text-[#C9A24D] flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">QR Code Not Activated Yet</h1>
            <p className="text-xs text-[#A3A3A3] mt-2 leading-relaxed">
              This QR code has not been assigned to an organization yet.
            </p>
          </div>
          <div className="pt-2">
            <span className="font-mono text-xs text-[#737373] bg-[#161616] px-3 py-1.5 rounded-lg border border-[#292929]">
              QR ID: {state.qrId}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // 4. Assigned State (Screen 11 - After Assignment)
  // Build the list of exactly four destination buttons, filtering out any unconfigured ones
  const buttons = [
    {
      id: 'reviews',
      label: 'Google Reviews',
      url: state.googleReviewsUrl,
      icon: Star,
      bgClass: 'bg-[#161616] border border-[#292929] hover:border-[#C9A24D]',
      iconColor: 'text-amber-400',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      url: state.instagramUrl,
      icon: Instagram,
      bgClass: 'bg-[#161616] border border-[#292929] hover:border-[#C9A24D]',
      iconColor: 'text-pink-400',
    },
    {
      id: 'website',
      label: 'Website',
      url: state.websiteUrl,
      icon: Globe,
      bgClass: 'bg-[#161616] border border-[#292929] hover:border-[#C9A24D]',
      iconColor: 'text-blue-400',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      url: state.whatsappUrl,
      icon: MessageCircle,
      bgClass: 'bg-[#161616] border border-[#292929] hover:border-[#C9A24D]',
      iconColor: 'text-emerald-400',
    },
  ].filter((btn) => Boolean(btn.url && btn.url.trim()))

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-center items-center p-6 selection:bg-[#C9A24D] selection:text-black">
      <div className="w-full max-w-sm mx-auto space-y-8 my-auto py-8">
        {/* Organization Name Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white break-words">
            {state.organizationName || 'Organization'}
          </h1>
        </div>

        {/* Exactly Four Destination Buttons */}
        <div className="space-y-4">
          {buttons.length === 0 ? (
            <div className="p-6 bg-[#111111] border border-[#292929] rounded-2xl text-center text-xs text-[#A3A3A3]">
              No destination links have been configured for this organization yet.
            </div>
          ) : (
            buttons.map((btn) => (
              <a
                key={btn.id}
                href={btn.url!}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center justify-between p-4.5 rounded-2xl ${btn.bgClass} transition-all duration-200 hover:shadow-[0_0_20px_rgba(201,162,77,0.15)] active:scale-[0.98]`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#111111] border border-[#292929] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <btn.icon className={`w-5 h-5 ${btn.iconColor}`} />
                  </div>
                  <span className="font-bold text-base text-white group-hover:text-[#C9A24D] transition-colors">
                    {btn.label}
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-[#737373] group-hover:text-white transition-colors" />
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
