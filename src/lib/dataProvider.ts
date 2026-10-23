import { supabase, STORAGE_BUCKETS, buildUserStoragePath, isSupabaseConfigured } from './supabase'
import type {
  QRCode,
  DashboardStats,
  QRStatus,
  QRCategory,
  SocialLink,
  LinkPage,
  UserSetting,
  ActivityLog,
  QRDownload,
} from '@/types/database'
import { formatQRId, buildPermanentUrl, isValidUrl } from './utils'

const STORAGE_KEYS = {
  QR_CODES: 'dominova_db_qr_codes',
  CATEGORIES: 'dominova_db_categories',
  BASE_URL: 'dominova_cfg_base_url',
  SETTINGS: 'dominova_cfg_settings',
}

// Re-export single source of truth for Supabase live status
export { isSupabaseConfigured } from './supabase'

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Local storage fallback engine to provide offline resilience
class LocalStorageEngine {
  private getStore(): QRCode[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.QR_CODES)
      if (raw) {
        const parsed = JSON.parse(raw) as QRCode[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }

      const now = new Date().toISOString()
      const initial: QRCode[] = []

      for (let i = 1; i <= 50; i++) {
        const paddedId = formatQRId(i)
        initial.push({
          id: `00000000-0000-0000-0000-${i.toString().padStart(12, '0')}`,
          name: paddedId,
          qr_id: paddedId,
          permanent_url: `https://product-nu-lyart.vercel.app/product/${paddedId}`,
          organization_name: null,
          google_reviews_url: null,
          instagram_url: null,
          website_url: null,
          whatsapp_url: null,
          destination_url: `https://product-nu-lyart.vercel.app/product/${paddedId}`,
          status: 'active',
          created_at: now,
          updated_at: now,
          assigned_at: null,
        })
      }

      localStorage.setItem(STORAGE_KEYS.QR_CODES, JSON.stringify(initial))
      return initial
    } catch {
      return []
    }
  }

  private saveStore(items: QRCode[]) {
    localStorage.setItem(STORAGE_KEYS.QR_CODES, JSON.stringify(items))
  }

  getAll(): QRCode[] {
    return this.getStore().sort((a, b) => {
      const numA = parseInt(a.qr_id || a.name || '0', 10)
      const numB = parseInt(b.qr_id || b.name || '0', 10)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      return (a.qr_id || a.name).localeCompare(b.qr_id || b.name)
    })
  }

  getByQRId(qrId: string): QRCode | null {
    if (!qrId) return null
    let decoded = qrId
    try {
      decoded = decodeURIComponent(qrId).trim()
    } catch {
      decoded = qrId.trim()
    }

    const clean = decoded.toUpperCase()
    const numMatch = decoded.match(/^(\d+)$/)
    const formattedNum = numMatch ? formatQRId(numMatch[1]).toUpperCase() : null
    const slug = decoded.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const all = this.getStore()

    return (
      all.find((item) => {
        const itemQrId = (item.qr_id || '').toUpperCase()
        const itemName = (item.name || '').toUpperCase()
        const itemOrg = (item.organization_name || '').toUpperCase()
        const itemId = (item.id || '').toUpperCase()
        const itemOrgSlug = (item.organization_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

        return (
          itemQrId === clean ||
          (formattedNum && itemQrId === formattedNum) ||
          itemName === clean ||
          (formattedNum && (itemName === `QR ${formattedNum}` || itemName === `QR-${formattedNum}`)) ||
          (itemOrg && itemOrg === clean) ||
          (slug && itemOrgSlug === slug) ||
          itemId === clean
        )
      }) || null
    )
  }

  insertMany(newCodes: QRCode[]): { success: boolean; inserted: QRCode[]; error?: string } {
    const existing = this.getStore()
    const existingIds = new Set(existing.map((x) => (x.qr_id || x.name).toUpperCase()))

    for (const item of newCodes) {
      const idKey = (item.qr_id || item.name).toUpperCase()
      if (existingIds.has(idKey)) {
        return {
          success: false,
          inserted: [],
          error: `Duplicate QR conflict: ${item.qr_id || item.name} already exists.`,
        }
      }
    }

    const updated = [...existing, ...newCodes]
    this.saveStore(updated)
    return { success: true, inserted: newCodes }
  }

  update(qrId: string, updates: Partial<QRCode>): { success: boolean; updated?: QRCode; error?: string } {
    if (!qrId) return { success: false, error: 'QR ID required.' }
    let decoded = qrId
    try {
      decoded = decodeURIComponent(qrId).trim()
    } catch {
      decoded = qrId.trim()
    }

    const clean = decoded.toUpperCase()
    const numMatch = decoded.match(/^(\d+)$/)
    const formattedNum = numMatch ? formatQRId(numMatch[1]).toUpperCase() : null
    const slug = decoded.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const store = this.getStore()

    const index = store.findIndex((item) => {
      const itemQrId = (item.qr_id || '').toUpperCase()
      const itemName = (item.name || '').toUpperCase()
      const itemOrg = (item.organization_name || '').toUpperCase()
      const itemId = (item.id || '').toUpperCase()
      const itemOrgSlug = (item.organization_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      return (
        itemQrId === clean ||
        (formattedNum && itemQrId === formattedNum) ||
        itemName === clean ||
        (formattedNum && (itemName === `QR ${formattedNum}` || itemName === `QR-${formattedNum}`)) ||
        (itemOrg && itemOrg === clean) ||
        (slug && itemOrgSlug === slug) ||
        itemId === clean
      )
    })

    if (index === -1) {
      return { success: false, error: `QR ID ${qrId} not found.` }
    }

    const now = new Date().toISOString()
    const current = store[index]
    const assignedQrId = current.qr_id || (numMatch ? formatQRId(numMatch[1]) : qrId)
    const updatedItem: QRCode = {
      ...current,
      ...updates,
      qr_id: assignedQrId,
      permanent_url: current.permanent_url || buildPermanentUrl('https://product-nu-lyart.vercel.app', assignedQrId),
      updated_at: now,
    }

    store[index] = updatedItem
    this.saveStore(store)
    return { success: true, updated: updatedItem }
  }
}

const localEngine = new LocalStorageEngine()

/**
 * Maps raw database qr_code row and associated records to the QRCode domain model
 */
function mapDatabaseToQRCode(
  row: any,
  socialLinks: SocialLink[] = [],
  category: QRCategory | null = null,
  baseUrl: string = 'https://product-nu-lyart.vercel.app',
  linkPage?: any | null,
  forcedQrId?: string
): QRCode {
  // Extract sequential ID if present in forced parameter, link_pages slug, name or destination_url
  let qrId = forcedQrId || ''
  if (!qrId && linkPage?.slug) {
    const slugMatch = linkPage.slug.match(/(\d+)/)
    qrId = slugMatch ? formatQRId(parseInt(slugMatch[1], 10)) : linkPage.slug
  }
  if (!qrId) {
    const idMatch = row.name?.match(/(\d+)/)
    if (idMatch) {
      qrId = formatQRId(parseInt(idMatch[1], 10))
    } else if (row.destination_url) {
      const destMatch = row.destination_url.match(/product\/(\d+)/i)
      if (destMatch) {
        qrId = formatQRId(parseInt(destMatch[1], 10))
      }
    }
  }
  if (!qrId) {
    qrId = row.name || ''
  }

  const googleLink = socialLinks.find((s) => s.platform === 'google_reviews' || s.platform === 'google')?.url || null
  const instagramLink = socialLinks.find((s) => s.platform === 'instagram')?.url || null
  const socialWebsite = socialLinks.find((s) => s.platform === 'website')?.url || null
  const websiteLink =
    socialWebsite || (row.destination_url && !row.destination_url.includes('/product/') ? row.destination_url : null)
  const whatsappLink = socialLinks.find((s) => s.platform === 'whatsapp')?.url || null

  const permanentUrl = buildPermanentUrl(baseUrl, qrId)
  const isAssigned = Boolean(
    (linkPage?.title && linkPage.title.trim()) ||
    (row.name && !row.name.startsWith('QR-') && !row.name.match(/^\d+$/))
  )
  const organizationName = linkPage?.title?.trim() || (isAssigned && !row.name.startsWith('QR-') && !row.name.match(/^\d+$/) ? row.name.trim() : null)

  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    qr_type: row.qr_type || 'url',
    destination_url: row.destination_url || '',
    category_id: row.category_id || null,
    foreground_color: row.foreground_color || '#000000',
    background_color: row.background_color || '#FFFFFF',
    qr_image_path: row.qr_image_path || null,
    total_scans: row.total_scans || 0,
    status: (row.status === 'inactive' || row.status === 'expired' ? row.status : 'active') as QRStatus,
    expires_at: row.expires_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,

    // Computed UI & Dynamic landing page properties
    qr_id: qrId,
    permanent_url: permanentUrl,
    organization_name: organizationName,
    google_reviews_url: googleLink,
    instagram_url: instagramLink,
    website_url: websiteLink,
    whatsapp_url: whatsappLink,
    assigned_at: isAssigned ? row.updated_at : null,
    category,
  }
}

export const dataProvider = {
  getBaseUrl(): string {
    const saved = localStorage.getItem(STORAGE_KEYS.BASE_URL)
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, '')

    const envDomain = import.meta.env.VITE_VERCEL_DOMAIN || import.meta.env.VITE_QR_DOMAIN
    if (envDomain && !envDomain.includes('go.dominor.in')) {
      return envDomain.trim().replace(/\/+$/, '')
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin
    }

    return 'https://product-nu-lyart.vercel.app'
  },

  setBaseUrl(url: string): void {
    const cleaned = url.trim().replace(/\/+$/, '')
    localStorage.setItem(STORAGE_KEYS.BASE_URL, cleaned)
  },

  /**
   * Check whether live Supabase is active and operational
   */
  async checkSupabaseLive(): Promise<{ live: boolean; message: string }> {
    if (!isSupabaseConfigured()) {
      return {
        live: false,
        message: 'Supabase credentials are not configured in .env. Running in local fallback mode.',
      }
    }

    try {
      const { error } = await supabase.from('qr_codes').select('id').limit(1)
      if (error) {
        return {
          live: false,
          message: `Supabase query returned error: ${error.message}.`,
        }
      }
      return {
        live: true,
        message: 'Successfully connected to live Supabase project (qapoyyungfqpojnqgjur).',
      }
    } catch (err: any) {
      return {
        live: false,
        message: `Failed to connect to Supabase: ${err.message || 'Network error'}`,
      }
    }
  },

  /**
   * Calculate real dashboard metrics from database.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    if (isSupabaseConfigured()) {
      try {
        const [qrRes, scansRes] = await Promise.all([
          supabase.from('qr_codes').select('id, name, status, total_scans'),
          supabase.from('qr_scans').select('id', { count: 'exact', head: true }),
        ])

        if (!qrRes.error && qrRes.data) {
          const data = qrRes.data
          const totalQRCodes = data.length
          const assignedQRCodes = data.filter(
            (x: any) => x.name && !x.name.startsWith('QR-') && !x.name.match(/^\d+$/)
          ).length
          const availableQRCodes = Math.max(0, totalQRCodes - assignedQRCodes)
          const uniqueOrgs = new Set(
            data
              .filter((x: any) => x.name && !x.name.startsWith('QR-') && !x.name.match(/^\d+$/))
              .map((x: any) => x.name?.trim())
          )

          const totalScans =
            typeof scansRes.count === 'number'
              ? scansRes.count
              : data.reduce((acc: number, curr: any) => acc + (curr.total_scans || 0), 0)

          return {
            totalQRCodes,
            availableQRCodes,
            assignedQRCodes,
            totalOrganizations: uniqueOrgs.size,
            totalScans,
          }
        }
      } catch (err) {
        console.warn('Fallback to local store for stats:', err)
      }
    }

    const all = localEngine.getAll()
    const totalQRCodes = all.length
    const assignedQRCodes = all.filter(
      (x) => x.organization_name && !x.organization_name.startsWith('QR-') && !x.organization_name.match(/^\d+$/)
    ).length
    const availableQRCodes = Math.max(0, totalQRCodes - assignedQRCodes)
    const uniqueOrgs = new Set(
      all
        .filter((x) => x.organization_name && !x.organization_name.startsWith('QR-') && !x.organization_name.match(/^\d+$/))
        .map((x) => x.organization_name!.trim())
    )

    return {
      totalQRCodes,
      availableQRCodes,
      assignedQRCodes,
      totalOrganizations: uniqueOrgs.size,
      totalScans: 0,
    }
  },

  /**
   * Fetch QR codes with searching and filtering scoped to authenticated user.
   */
  async getQRCodes(options: {
    search?: string
    statusFilter?: string
    page?: number
    pageSize?: number
  }): Promise<{ qrCodes: QRCode[]; total: number }> {
    const { search = '', statusFilter = 'all', page = 0, pageSize = 50 } = options
    const baseUrl = this.getBaseUrl()

    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('qr_codes').select('*', { count: 'exact' })

        if (statusFilter && statusFilter !== 'all') {
          const filterLower = statusFilter.toLowerCase()
          if (filterLower === 'assigned') {
            const { data: assignedLps } = await supabase
              .from('link_pages')
              .select('qr_code_id')
              .not('title', 'is', null)
            const assignedIds = assignedLps?.map((l: any) => l.qr_code_id).filter(Boolean) || []
            if (assignedIds.length > 0) {
              query = query.in('id', assignedIds).eq('status', 'active')
            } else {
              return { qrCodes: [], total: 0 }
            }
          } else if (filterLower === 'available') {
            const { data: assignedLps } = await supabase
              .from('link_pages')
              .select('qr_code_id')
              .not('title', 'is', null)
            const assignedIds = assignedLps?.map((l: any) => l.qr_code_id).filter(Boolean) || []
            if (assignedIds.length > 0) {
              query = query.not('id', 'in', `(${assignedIds.join(',')})`).eq('status', 'active')
            } else {
              query = query.eq('status', 'active')
            }
          } else if (filterLower === 'inactive') {
            query = query.eq('status', 'inactive')
          } else if (filterLower === 'expired') {
            query = query.eq('status', 'expired')
          } else {
            query = query.eq('status', statusFilter)
          }
        }

        if (search && search.trim()) {
          const s = search.trim()
          const { data: matchedLps } = await supabase
            .from('link_pages')
            .select('qr_code_id')
            .or(`title.ilike.%${s}%,slug.ilike.%${s}%`)
          const matchedIds = matchedLps?.map((l: any) => l.qr_code_id).filter(Boolean) || []
          if (matchedIds.length > 0) {
            query = query.or(`name.ilike.%${s}%,destination_url.ilike.%${s}%,id.in.(${matchedIds.join(',')})`)
          } else {
            query = query.or(`name.ilike.%${s}%,destination_url.ilike.%${s}%`)
          }
        }

        const from = page * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to).order('name', { ascending: true })

        const { data, count, error } = await query
        if (!error && data && data.length > 0) {
          // Fetch associated social links and link pages for these QR codes
          const qrIds = data.map((d: any) => d.id)
          const [{ data: socials }, { data: linkPages }] = await Promise.all([
            supabase.from('social_links').select('*').in('qr_code_id', qrIds),
            supabase.from('link_pages').select('*').in('qr_code_id', qrIds),
          ])

          const socialsList = (socials as SocialLink[]) || []
          const linkPagesList = linkPages || []

          const qrCodes = data.map((row: any) => {
            const rowSocials = socialsList.filter((s) => s.qr_code_id === row.id)
            const rowLinkPage = linkPagesList.find((lp: any) => lp.qr_code_id === row.id)
            return mapDatabaseToQRCode(row, rowSocials, null, baseUrl, rowLinkPage)
          })

          return {
            qrCodes,
            total: count || data.length,
          }
        } else if (!error && data && data.length === 0) {
          // Empty state in database
          return { qrCodes: [], total: count || 0 }
        }
      } catch (err) {
        console.warn('Fallback to local store for list:', err)
      }
    }

    // Local engine fallback
    let items = localEngine.getAll()

    if (statusFilter && statusFilter !== 'all') {
      const target = statusFilter.toLowerCase()
      items = items.filter((x) => x.status.toLowerCase() === target)
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter(
        (x) =>
          (x.qr_id && x.qr_id.toLowerCase().includes(q)) ||
          x.name.toLowerCase().includes(q) ||
          (x.organization_name && x.organization_name.toLowerCase().includes(q)) ||
          (x.destination_url && x.destination_url.toLowerCase().includes(q)) ||
          (x.permanent_url && x.permanent_url.toLowerCase().includes(q))
      )
    }

    const total = items.length
    const start = page * pageSize
    const paginated = items.slice(start, start + pageSize)

    return {
      qrCodes: paginated,
      total,
    }
  },

  /**
   * Get single QR code by unique ID or name
   */
  async getQRCodeByQRId(qrId: string): Promise<QRCode | null> {
    if (!qrId) return null
    let clean = qrId
    try {
      clean = decodeURIComponent(qrId).trim()
    } catch {
      clean = qrId.trim()
    }

    const baseUrl = this.getBaseUrl()
    const numMatch = clean.match(/^(\d+)$/)
    const formatted = numMatch ? formatQRId(numMatch[1]) : clean
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)

    if (isSupabaseConfigured()) {
      try {
        let row: any = null
        let rowLinkPage: any = null

        // 1. By UUID
        if (isUuid) {
          const { data } = await supabase.from('qr_codes').select('*').eq('id', clean).limit(1)
          if (data && data.length > 0) row = data[0]
        }

        // 2. By link_pages slug (authoritative assignment link)
        if (!row && formatted) {
          const { data: lpData } = await supabase
            .from('link_pages')
            .select('*')
            .or(`slug.ilike."${formatted}",slug.ilike."${clean}"`)
            .limit(1)
          if (lpData && lpData.length > 0 && lpData[0].qr_code_id) {
            rowLinkPage = lpData[0]
            const { data: qrData } = await supabase
              .from('qr_codes')
              .select('*')
              .eq('id', lpData[0].qr_code_id)
              .limit(1)
            if (qrData && qrData.length > 0) row = qrData[0]
          }
        }

        // 3. By qr_codes name
        if (!row) {
          let query = supabase.from('qr_codes').select('*')
          if (numMatch) {
            query = query.or(`name.ilike."${formatted}",name.ilike."QR-${formatted}",name.ilike."QR ${formatted}",name.ilike."${clean}"`)
          } else {
            query = query.ilike('name', `%${clean}%`)
          }
          const { data } = await query.limit(1)
          if (data && data.length > 0) row = data[0]
        }

        // 4. By destination_url containing /product/ID
        if (!row && formatted) {
          const { data: byDest } = await supabase
            .from('qr_codes')
            .select('*')
            .ilike('destination_url', `%/product/${formatted}%`)
            .limit(1)
          if (byDest && byDest.length > 0) row = byDest[0]
        }

        if (row) {
          const [{ data: socials }, { data: linkPages }] = await Promise.all([
            supabase.from('social_links').select('*').eq('qr_code_id', row.id),
            rowLinkPage ? Promise.resolve({ data: [rowLinkPage] }) : supabase.from('link_pages').select('*').eq('qr_code_id', row.id),
          ])
          const finalLinkPage = (linkPages && linkPages.length > 0 ? linkPages[0] : rowLinkPage) || null
          return mapDatabaseToQRCode(
            row,
            (socials as SocialLink[]) || [],
            null,
            baseUrl,
            finalLinkPage,
            numMatch ? formatted : undefined
          )
        }
      } catch (err) {
        console.warn('Fallback to local store for get:', err)
      }
    }

    return localEngine.getByQRId(clean)
  },

  /**
   * Calculates the next sequential available QR number across all existing records.
   */
  async getNextAvailableNumber(): Promise<number> {
    const existingIds = new Set<string>()

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('qr_codes').select('name')
        if (!error && data) {
          data.forEach((x: any) => {
            if (x.name) {
              const match = x.name.match(/\d+/)
              if (match) existingIds.add(match[1])
            }
          })
        }
      } catch (err) {
        console.warn('Failed to query Supabase for next free number:', err)
      }
    }

    const allLocal = localEngine.getAll()
    allLocal.forEach((x) => {
      const match = (x.qr_id || x.name).match(/\d+/)
      if (match) existingIds.add(match[1])
    })

    if (existingIds.size === 0) {
      return 1
    }

    let highestNum = 0
    existingIds.forEach((id) => {
      const num = parseInt(id, 10)
      if (!isNaN(num) && num > highestNum) {
        highestNum = num
      }
    })

    return highestNum + 1
  },

  /**
   * Check range availability before generating.
   */
  async checkRangeAvailability(
    startNumber: number,
    quantity: number
  ): Promise<{
    available: boolean
    conflictingIds: string[]
    nextAvailableStart: number
  }> {
    const requestedIds: string[] = []
    for (let i = 0; i < quantity; i++) {
      requestedIds.push(formatQRId(startNumber + i))
    }

    const existingIds = new Set<string>()

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('qr_codes').select('name')
        if (!error && data) {
          data.forEach((x: any) => {
            if (x.name) {
              const match = x.name.match(/\d+/)
              if (match) existingIds.add(formatQRId(parseInt(match[1], 10)))
            }
          })
        }
      } catch (err) {
        console.warn('Failed to query Supabase for range check:', err)
      }
    }

    const allLocal = localEngine.getAll()
    allLocal.forEach((x) => {
      const match = (x.qr_id || x.name).match(/\d+/)
      if (match) existingIds.add(formatQRId(parseInt(match[1], 10)))
    })

    const conflicting = requestedIds.filter((id) => existingIds.has(id))

    let highestNum = 0
    existingIds.forEach((id) => {
      const num = parseInt(id, 10)
      if (!isNaN(num) && num > highestNum) {
        highestNum = num
      }
    })

    return {
      available: conflicting.length === 0,
      conflictingIds: conflicting,
      nextAvailableStart: highestNum + 1,
    }
  },

  /**
   * Bulk QR Generation.
   * Inserts permanent QR code records with verified database schema.
   */
  async generateBulkQR(params: {
    startNumber: number
    quantity: number
    baseUrl?: string
    categoryId?: string | null
    foregroundColor?: string
    backgroundColor?: string
  }): Promise<{
    success: boolean
    qrCodes: QRCode[]
    error?: string
  }> {
    const {
      startNumber,
      quantity,
      baseUrl = this.getBaseUrl(),
      categoryId = null,
      foregroundColor = '#000000',
      backgroundColor = '#FFFFFF',
    } = params

    if (quantity <= 0) {
      return { success: false, qrCodes: [], error: 'Quantity must be greater than zero.' }
    }
    if (quantity > 1000) {
      return { success: false, qrCodes: [], error: 'Maximum 1,000 QR codes per batch.' }
    }

    // 1. Verify range availability
    const check = await this.checkRangeAvailability(startNumber, quantity)
    if (!check.available) {
      return {
        success: false,
        qrCodes: [],
        error: `Requested range conflicts with existing records (${check.conflictingIds.slice(0, 5).join(', ')}${
          check.conflictingIds.length > 5 ? '...' : ''
        }). Next suggested starting number is ${formatQRId(check.nextAvailableStart)}.`,
      }
    }

    // 2. Validate current authenticated user directly with Supabase Auth
    const now = new Date().toISOString()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.warn('[Supabase Auth]: User verification failed or session missing.', authError?.message)
      return {
        success: false,
        qrCodes: [],
        error: 'Your session has expired. Please log in again.',
      }
    }

    const currentUserId = user.id

    // Ensure public.profiles record exists for the authenticated user before insertion
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUserId)
        .maybeSingle()

      if (!existingProfile) {
        await supabase.from('profiles').insert([
          {
            id: currentUserId,
            username: user.user_metadata?.username || user.email?.split('@')[0] || `user_${currentUserId.slice(0, 8)}`,
            full_name: user.user_metadata?.full_name || user.email || 'Admin',
            role: 'admin',
            account_status: 'active',
          },
        ])
      }
    } catch (profileErr) {
      console.warn('[Profile Sync Notice]:', profileErr)
    }

    const dbRecordsToInsert: any[] = []
    const domainRecords: QRCode[] = []

    for (let i = 0; i < quantity; i++) {
      const currentNum = startNumber + i
      const qrId = formatQRId(currentNum)
      const qrName = qrId
      const permanentUrl = buildPermanentUrl(baseUrl, qrId)

      const dbRow: any = {
        user_id: currentUserId,
        name: qrName,
        qr_type: 'url',
        destination_url: permanentUrl,
        category_id: categoryId,
        foreground_color: foregroundColor,
        background_color: backgroundColor,
        status: 'active', // Validated constraint: 'active' | 'inactive' | 'expired'
        total_scans: 0,
        created_at: now,
        updated_at: now,
      }

      dbRecordsToInsert.push(dbRow)

      domainRecords.push({
        id: generateUUID(),
        user_id: currentUserId,
        name: qrName,
        qr_id: qrId,
        permanent_url: permanentUrl,
        organization_name: null,
        destination_url: permanentUrl,
        google_reviews_url: null,
        instagram_url: null,
        website_url: null,
        whatsapp_url: null,
        status: 'active',
        created_at: now,
        updated_at: now,
        assigned_at: null,
      })
    }

    // 3. Persist to live Supabase if connected
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('qr_codes').insert(dbRecordsToInsert).select()
        if (error) {
          console.error('[Supabase Insert Error]:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          })
          return {
            success: false,
            qrCodes: [],
            error: `Database insertion failed: ${error.message}${error.details ? ` (${error.details})` : ''}`,
          }
        }

        const mapped = ((data as any[]) || []).map((row) => mapDatabaseToQRCode(row, [], null, baseUrl))
        localEngine.insertMany(mapped)
        return {
          success: true,
          qrCodes: mapped,
        }
      } catch (err: any) {
        console.error('[Supabase Network Error]:', err.message)
        return {
          success: false,
          qrCodes: [],
          error: `Database network error: ${err.message || 'Operation failed'}`,
        }
      }
    }

    // Fallback: Local database vault
    const res = localEngine.insertMany(domainRecords)
    if (!res.success) {
      return { success: false, qrCodes: [], error: res.error }
    }

    return {
      success: true,
      qrCodes: domainRecords,
    }
  },

  /**
   * Configure an existing QR code.
   * Saves the organization name, updates destination link, and persists social links.
   */
  async configureQRCode(
    qrId: string,
    payload: {
      organization_name: string
      google_reviews_url?: string | null
      instagram_url?: string | null
      website_url?: string | null
      whatsapp_url?: string | null
      category_id?: string | null
      foreground_color?: string
      background_color?: string
    }
  ): Promise<{ success: boolean; qrCode?: QRCode; error?: string }> {
    const formattedId = formatQRId(qrId)
    const orgName = payload.organization_name?.trim()

    if (!orgName) {
      return { success: false, error: 'Organization Name is required.' }
    }

    if (payload.google_reviews_url && !isValidUrl(payload.google_reviews_url)) {
      return { success: false, error: 'Google Reviews URL must be a valid HTTP or HTTPS address.' }
    }
    if (payload.instagram_url && !isValidUrl(payload.instagram_url)) {
      return { success: false, error: 'Instagram URL must be a valid HTTP or HTTPS address.' }
    }
    if (payload.website_url && !isValidUrl(payload.website_url)) {
      return { success: false, error: 'Website URL must be a valid HTTP or HTTPS address.' }
    }
    if (payload.whatsapp_url && !isValidUrl(payload.whatsapp_url)) {
      return { success: false, error: 'WhatsApp URL must be a valid address.' }
    }

    const now = new Date().toISOString()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.warn('[Supabase Auth]: User verification failed or session missing in configureQRCode.', authError?.message)
      return {
        success: false,
        error: 'Your session has expired. Please log in again.',
      }
    }

    const currentUserId = user.id

    // Ensure public.profiles record exists for the authenticated user before insertion
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUserId)
        .maybeSingle()

      if (!existingProfile) {
        await supabase.from('profiles').insert([
          {
            id: currentUserId,
            username: user.user_metadata?.username || user.email?.split('@')[0] || `user_${currentUserId.slice(0, 8)}`,
            full_name: user.user_metadata?.full_name || user.email || 'Admin',
            role: 'admin',
            account_status: 'active',
          },
        ])
      }
    } catch (profileErr) {
      console.warn('[Profile Sync Notice]:', profileErr)
    }

    const primaryDestination =
      payload.website_url?.trim() ||
      payload.google_reviews_url?.trim() ||
      payload.instagram_url?.trim() ||
      payload.whatsapp_url?.trim() ||
      this.getBaseUrl()

    if (isSupabaseConfigured()) {
      try {
        // 1. Locate existing QR record safely without invalid UUID casting
        const isLocateUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrId)
        let targetQR: any = null

        // Strategy A: By UUID
        if (isLocateUuid) {
          const { data } = await supabase.from('qr_codes').select('*').eq('id', qrId).limit(1)
          if (data && data.length > 0) targetQR = data[0]
        }

        // Strategy B: Via link_pages slug
        if (!targetQR) {
          const { data: lpMatch } = await supabase
            .from('link_pages')
            .select('qr_code_id')
            .or(`slug.ilike."${formattedId}",slug.ilike."${qrId}"`)
            .limit(1)
          if (lpMatch && lpMatch.length > 0 && lpMatch[0].qr_code_id) {
            const { data: qrByLp } = await supabase.from('qr_codes').select('*').eq('id', lpMatch[0].qr_code_id).limit(1)
            if (qrByLp && qrByLp.length > 0) targetQR = qrByLp[0]
          }
        }

        // Strategy C: By name
        if (!targetQR) {
          const { data: byName } = await supabase
            .from('qr_codes')
            .select('*')
            .or(`name.ilike."${formattedId}",name.ilike."QR-${formattedId}",name.ilike."QR ${formattedId}",name.ilike."${qrId}"`)
            .limit(1)
          if (byName && byName.length > 0) targetQR = byName[0]
        }

        // Strategy D: By destination_url containing /product/ID
        if (!targetQR) {
          const { data: byDest } = await supabase
            .from('qr_codes')
            .select('*')
            .ilike('destination_url', `%/product/${formattedId}%`)
            .limit(1)
          if (byDest && byDest.length > 0) targetQR = byDest[0]
        }

        const permanentUrl = buildPermanentUrl(this.getBaseUrl(), formattedId)

        if (!targetQR) {
          // Create record if not yet generated
          const { data: inserted, error: insertErr } = await supabase
            .from('qr_codes')
            .insert([
              {
                user_id: currentUserId,
                name: formattedId,
                qr_type: 'url',
                qr_mode: 'dynamic',
                destination_url: permanentUrl,
                category_id: payload.category_id || null,
                foreground_color: payload.foreground_color || '#000000',
                background_color: payload.background_color || '#FFFFFF',
                status: 'active',
                total_scans: 0,
              },
            ])
            .select()
            .single()

          if (insertErr || !inserted) {
            console.error('[Supabase Insert Error]:', insertErr)
            return {
              success: false,
              error: `Failed to create QR code: ${insertErr?.message}${insertErr?.details ? ` (${insertErr?.details})` : ''}`,
            }
          }
          targetQR = inserted
        } else {
          // Update record - ensure name is clean QR ID and permanent URL is preserved
          const updatePayload: any = {
            name: formattedId,
            destination_url: permanentUrl,
            status: 'active',
            updated_at: now,
          }
          if (payload.category_id !== undefined) updatePayload.category_id = payload.category_id
          if (payload.foreground_color) updatePayload.foreground_color = payload.foreground_color
          if (payload.background_color) updatePayload.background_color = payload.background_color

          const { error: updateErr } = await supabase
            .from('qr_codes')
            .update(updatePayload)
            .eq('id', targetQR.id)

          if (updateErr) {
            console.error('[Supabase Update Error]:', updateErr)
            return {
              success: false,
              error: `Database update failed: ${updateErr.message}${updateErr.details ? ` (${updateErr.details})` : ''}`,
            }
          }
        }

        const effectiveUserId = targetQR.user_id || currentUserId

        // 2. Persist social links in public.social_links
        const platformsToSync = [
          { platform: 'google_reviews', url: payload.google_reviews_url, title: 'Google Reviews' },
          { platform: 'instagram', url: payload.instagram_url, title: 'Instagram' },
          { platform: 'website', url: payload.website_url, title: 'Website' },
          { platform: 'whatsapp', url: payload.whatsapp_url, title: 'WhatsApp' },
        ]

        for (const item of platformsToSync) {
          const cleanUrl = item.url?.trim()
          const { data: existingLink } = await supabase
            .from('social_links')
            .select('id')
            .eq('qr_code_id', targetQR.id)
            .eq('platform', item.platform)
            .maybeSingle()

          if (cleanUrl) {
            if (existingLink) {
              const { error: slUpdErr } = await supabase
                .from('social_links')
                .update({ url: cleanUrl, is_active: true, updated_at: now })
                .eq('id', existingLink.id)
              if (slUpdErr) {
                console.error('[Supabase social_links update error]:', slUpdErr)
                return { success: false, error: `Failed to save ${item.title}: ${slUpdErr.message}` }
              }
            } else {
              const { error: slInsErr } = await supabase.from('social_links').insert([
                {
                  user_id: effectiveUserId,
                  qr_code_id: targetQR.id,
                  platform: item.platform,
                  url: cleanUrl,
                  title: item.title,
                  display_order: 0,
                  is_active: true,
                },
              ])
              if (slInsErr) {
                console.error('[Supabase social_links insert error]:', slInsErr)
                return { success: false, error: `Failed to save ${item.title}: ${slInsErr.message}` }
              }
            }
          } else {
            // Deactivate or remove blank link
            if (existingLink) {
              await supabase
                .from('social_links')
                .update({ is_active: false, url: '', updated_at: now })
                .eq('id', existingLink.id)
            }
          }
        }

        // 3. Persist organization assignment in public.link_pages
        const { data: existingLp } = await supabase
          .from('link_pages')
          .select('id')
          .or(`qr_code_id.eq.${targetQR.id},slug.eq.${formattedId}`)
          .maybeSingle()

        if (existingLp) {
          const { error: lpUpdErr } = await supabase
            .from('link_pages')
            .update({
              qr_code_id: targetQR.id,
              title: orgName,
              slug: formattedId,
              is_published: true,
              updated_at: now,
            })
            .eq('id', existingLp.id)

          if (lpUpdErr) {
            console.error('[Supabase link_pages update error]:', lpUpdErr)
            return { success: false, error: `Failed to save organization assignment: ${lpUpdErr.message}` }
          }
        } else {
          const { error: lpInsErr } = await supabase
            .from('link_pages')
            .insert([
              {
                user_id: effectiveUserId,
                qr_code_id: targetQR.id,
                title: orgName,
                slug: formattedId,
                is_published: true,
              },
            ])

          if (lpInsErr) {
            console.error('[Supabase link_pages insert error]:', lpInsErr)
            return { success: false, error: `Failed to save organization assignment: ${lpInsErr.message}` }
          }
        }

        // 4. Reload latest authoritative state directly from database
        const [{ data: refreshedQR }, { data: refreshedSocials }, { data: refreshedLP }] = await Promise.all([
          supabase.from('qr_codes').select('*').eq('id', targetQR.id).single(),
          supabase.from('social_links').select('*').eq('qr_code_id', targetQR.id),
          supabase.from('link_pages').select('*').eq('qr_code_id', targetQR.id).maybeSingle(),
        ])

        const finalQRCode = mapDatabaseToQRCode(
          refreshedQR || targetQR,
          (refreshedSocials as SocialLink[]) || [],
          null,
          this.getBaseUrl(),
          refreshedLP || { slug: formattedId, title: orgName },
          formattedId
        )

        localEngine.update(formattedId, finalQRCode)
        return { success: true, qrCode: finalQRCode }
      } catch (err: any) {
        return { success: false, error: `Error saving to database: ${err.message}` }
      }
    }

    // Fallback: Local database vault
    const localUpdates: Partial<QRCode> = {
      organization_name: orgName,
      google_reviews_url: payload.google_reviews_url?.trim() || null,
      instagram_url: payload.instagram_url?.trim() || null,
      website_url: payload.website_url?.trim() || null,
      whatsapp_url: payload.whatsapp_url?.trim() || null,
      destination_url: primaryDestination,
      status: 'active',
      assigned_at: now,
      updated_at: now,
    }

    const localRes = localEngine.update(formattedId, localUpdates)
    if (!localRes.success) {
      return { success: false, error: localRes.error }
    }

    return { success: true, qrCode: localRes.updated }
  },

  /**
   * Delete QR code where permitted by RLS
   */
  async deleteQRCode(qrId: string): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('qr_codes').delete().eq('id', qrId)
        if (error) return { success: false, error: error.message }
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
    return { success: true }
  },

  /**
   * Category Management (PHASE 6)
   */
  async getCategories(): Promise<QRCategory[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('qr_categories')
          .select('*')
          .order('name', { ascending: true })
        if (!error && data) return data as QRCategory[]
      } catch (err) {
        console.warn('Get categories error:', err)
      }
    }
    return []
  },

  async createCategory(name: string, description?: string): Promise<{ success: boolean; category?: QRCategory; error?: string }> {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Your session has expired. Please log in again.' }
    const userId = user.id

    try {
      const { data, error } = await supabase
        .from('qr_categories')
        .insert([{ user_id: userId, name: name.trim(), description: description?.trim() || null }])
        .select()
        .single()
      if (error) return { success: false, error: error.message }
      return { success: true, category: data as QRCategory }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  },

  async deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('qr_categories').delete().eq('id', id)
      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Social Links Management (PHASE 6)
   */
  async getSocialLinks(qrCodeId: string): Promise<SocialLink[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('social_links')
          .select('*')
          .eq('qr_code_id', qrCodeId)
          .order('display_order', { ascending: true })
        if (!error && data) return data as SocialLink[]
      } catch (err) {
        console.warn('Get social links error:', err)
      }
    }
    return []
  },

  async deleteSocialLink(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('social_links').delete().eq('id', id)
      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Link Pages Management (PHASE 7)
   */
  async getLinkPages(): Promise<LinkPage[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('link_pages')
          .select('*')
          .order('created_at', { ascending: false })
        if (!error && data) return data as LinkPage[]
      } catch (err) {
        console.warn('Get link pages error:', err)
      }
    }
    return []
  },

  async getPublicLinkPage(slug: string): Promise<LinkPage | null> {
    if (isSupabaseConfigured()) {
      try {
        // Enforce safe published-only policy
        const { data, error } = await supabase
          .from('link_pages')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .maybeSingle()
        if (!error && data) return data as LinkPage
      } catch (err) {
        console.warn('Get public link page error:', err)
      }
    }
    return null
  },

  /**
   * User Settings Management (PHASE 7)
   */
  async getUserSettings(): Promise<UserSetting | null> {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) return null

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
        if (!error && data) return data as UserSetting
      } catch (err) {
        console.warn('Get user settings error:', err)
      }
    }
    return null
  },

  async updateUserSettings(settings: { theme?: string; default_qr_color?: string }): Promise<{ success: boolean; error?: string }> {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Your session has expired. Please log in again.' }
    const userId = user.id

    if (isSupabaseConfigured()) {
      try {
        const payload: any = {
          user_id: userId,
          updated_at: new Date().toISOString(),
        }
        if (settings.theme) payload.theme = settings.theme
        if (settings.default_qr_color) payload.default_qr_color = settings.default_qr_color

        const { error } = await supabase.from('user_settings').upsert(payload)
        if (error) return { success: false, error: error.message }
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
    return { success: true }
  },

  /**
   * Storage File Upload (PHASE 8)
   */
  async uploadFile(bucket: string, file: File | Blob, filename: string): Promise<{ success: boolean; path?: string; publicUrl?: string; error?: string }> {
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData?.session?.user?.id
    if (!userId) return { success: false, error: 'User must be authenticated to upload files.' }

    const filePath = buildUserStoragePath(userId, filename)

    try {
      const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

      if (error) {
        return { success: false, error: `Storage upload failed: ${error.message}` }
      }

      if (bucket === STORAGE_BUCKETS.PROFILE_IMAGES) {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
        return { success: true, path: data.path, publicUrl: urlData.publicUrl }
      }

      return { success: true, path: data.path }
    } catch (err: any) {
      return { success: false, error: err.message || 'Storage upload error' }
    }
  },

  /**
   * Analytics & Real Scan Event (PHASE 9)
   */
  async recordScan(qrCodeId: string): Promise<void> {
    if (!isSupabaseConfigured()) return

    try {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
      const isMobile = /mobile/i.test(userAgent)
      const browser = /chrome/i.test(userAgent) ? 'Chrome' : /firefox/i.test(userAgent) ? 'Firefox' : /safari/i.test(userAgent) ? 'Safari' : 'Other'
      const referrer = typeof document !== 'undefined' ? document.referrer || null : null

      await supabase.from('qr_scans').insert([
        {
          qr_code_id: qrCodeId,
          browser,
          device_type: isMobile ? 'mobile' : 'desktop',
          referrer,
          scanned_at: new Date().toISOString(),
        },
      ])
    } catch (err) {
      console.warn('Record scan notice:', err)
    }
  },

  async recordDownload(qrCodeId: string, format: string = 'png'): Promise<void> {
    if (!isSupabaseConfigured()) return

    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) return

    try {
      await supabase.from('qr_downloads').insert([
        {
          user_id: userId,
          qr_code_id: qrCodeId,
          downloaded_at: new Date().toISOString(),
          format,
        },
      ])
    } catch (err) {
      console.warn('Record download notice:', err)
    }
  },

  /**
   * Public landing page lookup for /product/:id
   * Secure, narrow public read query with real scan tracking.
   */
  async getPublicQRData(qrId: string): Promise<{
    status: 'Available' | 'Assigned' | 'inactive' | 'expired' | 'not_found'
    qr_id: string
    organization_name?: string | null
    google_reviews_url?: string | null
    instagram_url?: string | null
    website_url?: string | null
    whatsapp_url?: string | null
  }> {
    if (!qrId) {
      return { status: 'not_found', qr_id: '' }
    }

    let clean = qrId
    try {
      clean = decodeURIComponent(qrId).trim()
    } catch {
      clean = qrId.trim()
    }

    if (!clean) {
      return { status: 'not_found', qr_id: '' }
    }

    const numMatch = clean.match(/^(\d+)$/)
    const formattedId = numMatch ? formatQRId(numMatch[1]) : clean
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)

    if (isSupabaseConfigured()) {
      try {
        let targetRow: any = null
        let linkPageRow: any = null
        let resolvedQrId = formattedId

        // 1. Authoritative lookup via link_pages by slug
        const { data: lpData } = await supabase
          .from('link_pages')
          .select('id, qr_code_id, title, slug, is_published')
          .or(`slug.ilike."${formattedId}",slug.ilike."${clean}"`)
          .limit(1)

        if (lpData && lpData.length > 0 && lpData[0].qr_code_id) {
          linkPageRow = lpData[0]
          const { data: qrByLp } = await supabase
            .from('qr_codes')
            .select('id, name, status, destination_url')
            .eq('id', lpData[0].qr_code_id)
            .limit(1)
          if (qrByLp && qrByLp.length > 0) {
            targetRow = qrByLp[0]
            if (linkPageRow.slug) resolvedQrId = formatQRId(linkPageRow.slug)
          }
        }

        // 2. If not located by link_pages slug, search qr_codes by uuid, name, or destination_url
        if (!targetRow) {
          if (isUuid) {
            const { data } = await supabase
              .from('qr_codes')
              .select('id, name, status, destination_url')
              .eq('id', clean)
              .limit(1)
            if (data && data.length > 0) targetRow = data[0]
          } else if (numMatch) {
            // Find by exact name or padded variations
            const { data } = await supabase
              .from('qr_codes')
              .select('id, name, status, destination_url')
              .or(`name.ilike."${formattedId}",name.ilike."QR-${formattedId}",name.ilike."QR ${formattedId}",name.ilike."${clean}"`)
              .limit(1)
            if (data && data.length > 0) {
              targetRow = data[0]
            }

            // Check destination_url containing /product/ID
            if (!targetRow) {
              const { data: byDest } = await supabase
                .from('qr_codes')
                .select('id, name, status, destination_url')
                .ilike('destination_url', `%/product/${formattedId}%`)
                .limit(1)
              if (byDest && byDest.length > 0) {
                targetRow = byDest[0]
              }
            }
          } else {
            // Organization name or slug lookup
            const { data: byName } = await supabase
              .from('qr_codes')
              .select('id, name, status, destination_url')
              .ilike('name', clean)
              .limit(1)
            if (byName && byName.length > 0) {
              targetRow = byName[0]
            }

            if (!targetRow) {
              const { data: lpByName } = await supabase
                .from('link_pages')
                .select('id, qr_code_id, title, slug, is_published')
                .or(`title.ilike."${clean}",slug.ilike."${clean}"`)
                .limit(1)
              if (lpByName && lpByName.length > 0 && lpByName[0].qr_code_id) {
                linkPageRow = lpByName[0]
                const { data: qrByLp } = await supabase
                  .from('qr_codes')
                  .select('id, name, status, destination_url')
                  .eq('id', lpByName[0].qr_code_id)
                  .limit(1)
                if (qrByLp && qrByLp.length > 0) {
                  targetRow = qrByLp[0]
                  if (lpByName[0].slug) resolvedQrId = lpByName[0].slug
                }
              }
            }

            if (!targetRow) {
              const { data: byPartial } = await supabase
                .from('qr_codes')
                .select('id, name, status, destination_url')
                .ilike('name', `%${clean}%`)
                .limit(1)
              if (byPartial && byPartial.length > 0) {
                targetRow = byPartial[0]
              }
            }
          }
        }

        if (targetRow) {
          // Extract sequential QR ID if available from destination_url
          if (!numMatch) {
            const destMatch = targetRow.destination_url?.match(/product\/(\d+)/i)
            if (destMatch) {
              resolvedQrId = formatQRId(destMatch[1])
            }
          }

          // If linkPageRow wasn't fetched yet, fetch it for targetRow.id
          if (!linkPageRow) {
            const { data: lpByQr } = await supabase
              .from('link_pages')
              .select('id, qr_code_id, title, slug, is_published')
              .eq('qr_code_id', targetRow.id)
              .maybeSingle()
            if (lpByQr) {
              linkPageRow = lpByQr
              if (lpByQr.slug && !numMatch) resolvedQrId = lpByQr.slug
            }
          }

          // Handle inactive and expired records
          const rowStatus = (targetRow.status || 'active').toLowerCase()
          if (rowStatus === 'inactive') {
            return {
              status: 'inactive',
              qr_id: resolvedQrId,
              organization_name: linkPageRow?.title || targetRow.name,
            }
          }
          if (rowStatus === 'expired') {
            return {
              status: 'expired',
              qr_id: resolvedQrId,
              organization_name: linkPageRow?.title || targetRow.name,
            }
          }

          // Fetch associated public social links
          const { data: socials } = await supabase
            .from('social_links')
            .select('platform, url, is_active')
            .eq('qr_code_id', targetRow.id)
            .eq('is_active', true)

          const socialMap: Record<string, string> = {}
          if (socials) {
            socials.forEach((s: any) => {
              if (s.platform && s.url && s.url.trim()) {
                socialMap[s.platform] = s.url.trim()
              }
            })
          }

          const organizationName =
            linkPageRow?.title?.trim() ||
            (targetRow.name && !targetRow.name.startsWith('QR-') && !targetRow.name.match(/^\d+$/) ? targetRow.name.trim() : null)

          const isAssigned = Boolean(organizationName)

          // Record authentic scan in public.qr_scans
          this.recordScan(targetRow.id).catch(() => {})

          return {
            status: isAssigned ? 'Assigned' : 'Available',
            qr_id: resolvedQrId,
            organization_name: organizationName,
            google_reviews_url: socialMap['google_reviews'] || socialMap['google'] || null,
            instagram_url: socialMap['instagram'] || null,
            website_url: socialMap['website'] || (!targetRow.destination_url?.includes('/product/') ? targetRow.destination_url : null),
            whatsapp_url: socialMap['whatsapp'] || null,
          }
        }
      } catch (err) {
        console.warn('Fallback to local store for public page:', err)
      }
    }

    // Local fallback
    const localItem = localEngine.getByQRId(clean) || (numMatch ? localEngine.getByQRId(formattedId) : null)
    if (!localItem) {
      return { status: 'not_found', qr_id: formattedId }
    }

    if (localItem.status === 'inactive') {
      return {
        status: 'inactive',
        qr_id: localItem.qr_id || formattedId,
        organization_name: localItem.organization_name || localItem.name,
      }
    }
    if (localItem.status === 'expired') {
      return {
        status: 'expired',
        qr_id: localItem.qr_id || formattedId,
        organization_name: localItem.organization_name || localItem.name,
      }
    }

    const isLocalAssigned = Boolean(
      localItem.organization_name &&
      !localItem.organization_name.startsWith('QR-') &&
      !localItem.organization_name.match(/^\d+$/)
    )

    return {
      status: isLocalAssigned ? 'Assigned' : 'Available',
      qr_id: localItem.qr_id || formattedId,
      organization_name: localItem.organization_name,
      google_reviews_url: localItem.google_reviews_url,
      instagram_url: localItem.instagram_url,
      website_url: localItem.website_url,
      whatsapp_url: localItem.whatsapp_url,
    }
  },
}
