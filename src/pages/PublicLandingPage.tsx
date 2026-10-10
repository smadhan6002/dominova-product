import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { dataProvider } from '@/lib/dataProvider'
import { ChevronRight, Instagram, AlertCircle, Clock } from 'lucide-react'

interface PublicQRState {
  status: 'loading' | 'available' | 'assigned' | 'not_found'
  qrId: string
  organizationName?: string | null
  googleReviewsUrl?: string | null
  instagramUrl?: string | null
  websiteUrl?: string | null
  whatsappUrl?: string | null
}

/* Authentic Icon Components matching the reference design */
function GoogleIcon() {
  return (
    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#833AB4] flex items-center justify-center flex-shrink-0 p-0.5 shadow-sm">
      <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <div className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0 p-0.5 shadow-sm">
      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.301-.15-1.776-.876-2.052-.976-.275-.1-.476-.15-.676.15-.201.3-.777.977-.952 1.177-.175.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.084-.175-.3-.019-.463.132-.612.136-.135.301-.35.452-.526.15-.175.2-.3.301-.5.1-.2.05-.375-.025-.526-.075-.15-.676-1.63-.927-2.232-.244-.588-.493-.508-.677-.518-.175-.008-.376-.01-.577-.01-.2 0-.526.075-.802.375-.276.3-1.053 1.028-1.053 2.508 0 1.48 1.078 2.909 1.229 3.11.15.2 2.122 3.24 5.141 4.544.718.31 1.279.496 1.716.634.721.23 1.378.197 1.897.12.578-.087 1.776-.726 2.027-1.428.251-.702.251-1.303.176-1.428-.076-.126-.276-.201-.577-.352z" />
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.17L2 22l4.97-1.402A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2a8.163 8.163 0 0 1-4.167-1.144l-.299-.177-3.094.872.827-3.013-.194-.31A8.167 8.167 0 1 1 12 20.2z" clipRule="evenodd" />
      </svg>
    </div>
  )
}

function WebsiteIcon() {
  return (
    <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
      <svg className="w-6 h-6 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    </div>
  )
}

export default function PublicLandingPage() {
  const params = useParams()
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

  // Shared Dominova Instagram Footer
  const dominovaFooter = (
    <div className="pt-10 sm:pt-14 pb-6 flex items-center justify-center gap-4 w-full max-w-xs mx-auto">
      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-[#292929]" />
      <a
        href="https://www.instagram.com/dominova.tech/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs font-medium text-[#A3A3A3] hover:text-[#D4AF37] transition-all hover:scale-105"
      >
        <Instagram className="w-4 h-4 text-[#D4AF37]" />
        <span>@dominova.tech</span>
      </a>
      <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-[#292929]" />
    </div>
  )

  // 1. Loading State
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
          <p className="text-[#A3A3A3] text-xs tracking-wider uppercase font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // 2. Not Found State
  if (state.status === 'not_found') {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col justify-between items-center p-6 selection:bg-[#D4AF37] selection:text-black">
        <div className="my-auto w-full max-w-sm bg-[#111111] border border-[#292929] rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-white tracking-wide">QR Code Not Found</h1>
            <p className="text-xs text-[#A3A3A3] mt-2 leading-relaxed">
              The requested QR code identifier is not registered in the system.
            </p>
          </div>
        </div>
        {dominovaFooter}
      </div>
    )
  }

  // 3. Unassigned State (Before Assignment)
  if (state.status === 'available') {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col justify-between items-center p-6 selection:bg-[#D4AF37] selection:text-black">
        <div className="my-auto w-full max-w-sm bg-[#111111] border border-[#292929] rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-white tracking-wide">QR Code Not Activated Yet</h1>
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
        {dominovaFooter}
      </div>
    )
  }

  function normalizeDestinationUrl(rawUrl: string | null | undefined, type: string): string {
    if (!rawUrl || !rawUrl.trim()) return '#'
    const url = rawUrl.trim()
    if (type === 'whatsapp') {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const digits = url.replace(/[^\d]/g, '')
        if (digits) return `https://wa.me/${digits}`
      }
    }
    if (type === 'instagram') {
      if (url.startsWith('@')) {
        return `https://instagram.com/${url.slice(1)}`
      }
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`
    }
    return url
  }

  // 4. Assigned State — Matches Attached Reference Design Exactly
  // Exact 4 destination buttons in reference order: Google Reviews, Instagram, WhatsApp, Website
  const destinationButtons = [
    {
      id: 'reviews',
      label: 'Google Reviews',
      url: state.googleReviewsUrl,
      renderIcon: (disabled: boolean) => <GoogleIcon />,
    },
    {
      id: 'instagram',
      label: 'Instagram',
      url: state.instagramUrl,
      renderIcon: (disabled: boolean) => <InstagramIcon />,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      url: state.whatsappUrl,
      renderIcon: (disabled: boolean) => <WhatsAppIcon />,
    },
    {
      id: 'website',
      label: 'Website',
      url: state.websiteUrl,
      renderIcon: (disabled: boolean) => <WebsiteIcon />,
    },
  ]

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col justify-between items-center px-4 sm:px-6 py-8 sm:py-12 selection:bg-[#D4AF37] selection:text-black relative overflow-hidden">
      {/* Subtle background ambient golden vignettes */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 6%, rgba(212, 175, 55, 0.08) 0%, transparent 55%), radial-gradient(circle at 50% 94%, rgba(201, 162, 77, 0.06) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] sm:max-w-[460px] mx-auto my-auto flex flex-col items-center">
        {/* Customer Business Name Heading */}
        <div className="text-center w-full px-2">
          <h1 className="text-3xl sm:text-4xl md:text-[42px] font-bold font-serif tracking-normal text-transparent bg-clip-text bg-gradient-to-b from-[#FFF6D6] via-[#D4AF37] to-[#AA822A] drop-shadow-[0_2px_15px_rgba(212,175,55,0.3)] break-words leading-tight">
            {state.organizationName || 'ABC Salon'}
          </h1>

          {/* Delicate Ornamental Gold Divider Line with central flare */}
          <div className="relative flex items-center justify-center w-36 sm:w-44 mx-auto mt-3.5 mb-8 sm:mb-10">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-85" />
            <div className="absolute w-1.5 h-1.5 rotate-45 bg-[#F4C253] shadow-[0_0_8px_#F4C253]" />
          </div>
        </div>

        {/* The Four Destination Buttons */}
        <div className="w-full space-y-3.5 sm:space-y-4">
          {destinationButtons.map((btn) => {
            const hasUrl = Boolean(btn.url && btn.url.trim())
            const targetHref = hasUrl ? normalizeDestinationUrl(btn.url, btn.id) : '#'

            if (!hasUrl) {
              return (
                <div
                  key={btn.id}
                  className="flex items-center justify-between w-full h-[60px] sm:h-[64px] px-5 sm:px-6 rounded-full bg-[#0E0E0E]/80 border border-[#222222] opacity-45 cursor-not-allowed select-none"
                  title="Link not configured"
                >
                  <div className="flex items-center h-full flex-1 min-w-0">
                    <div className="flex items-center justify-center w-7 h-7 flex-shrink-0 grayscale">
                      {btn.renderIcon(true)}
                    </div>
                    <div className="w-[1px] h-5 bg-[#222222] mx-4 sm:mx-5 flex-shrink-0" />
                    <span className="font-sans font-medium text-base sm:text-[17px] text-[#666666] truncate">
                      {btn.label}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#444444] flex-shrink-0 pl-1" />
                </div>
              )
            }

            return (
              <a
                key={btn.id}
                href={targetHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-between w-full h-[60px] sm:h-[64px] px-5 sm:px-6 rounded-full bg-[#0B0B0B] border border-[#C9A24D]/40 transition-all duration-200 hover:border-[#D4AF37] hover:shadow-[0_0_22px_rgba(212,175,55,0.4)] active:bg-gradient-to-r active:from-[#C9A24D] active:via-[#D4AF37] active:to-[#F4C253] active:border-[#F4C253] active:shadow-[0_0_25px_rgba(244,194,83,0.5)] cursor-pointer select-none"
              >
                {/* Left: Icon + Vertical Divider + Label */}
                <div className="flex items-center h-full flex-1 min-w-0">
                  <div className="flex items-center justify-center w-7 h-7 flex-shrink-0">
                    {btn.renderIcon(false)}
                  </div>

                  {/* Vertical Divider */}
                  <div className="w-[1px] h-5 bg-[#262626] group-hover:bg-[#C9A24D]/45 group-active:bg-black/35 mx-4 sm:mx-5 flex-shrink-0 transition-colors" />

                  {/* Button Label */}
                  <span className="font-sans font-medium text-base sm:text-[17px] text-white group-active:text-[#0B0B0B] group-hover:text-white transition-colors truncate">
                    {btn.label}
                  </span>
                </div>

                {/* Right: Sleek Gold Chevron */}
                <div className="flex-shrink-0 pl-2">
                  <ChevronRight className="w-5 h-5 text-[#C9A24D] group-active:text-[#0B0B0B] group-hover:text-[#F4C253] group-hover:translate-x-0.5 transition-all" />
                </div>
              </a>
            )
          })}
        </div>
      </div>

      {/* Dominova Instagram Footer */}
      <div className="relative z-10 w-full">
        {dominovaFooter}
      </div>
    </div>
  )
}
