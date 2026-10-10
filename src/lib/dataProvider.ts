import { supabase } from './supabase'
import type { QRCode, DashboardStats, QRStatus } from '@/types/database'
import { formatQRId, buildPermanentUrl, isValidUrl } from './utils'

const STORAGE_KEYS = {
  QR_CODES: 'dominova_db_qr_codes',
  BASE_URL: 'dominova_cfg_base_url',
  SETTINGS: 'dominova_cfg_settings',
}

// Check if live Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL || ''
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  return Boolean(
    url &&
    key &&
    !url.includes('demo-project.supabase.co') &&
    !url.includes('your-project.supabase.co') &&
    !key.includes('demo-placeholder-key') &&
    !key.includes('your-anon-key-here')
  )
}

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

// Local storage storage engine with exact PostgreSQL schema semantics
class LocalStorageEngine {
  private getStore(): QRCode[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.QR_CODES)
      if (!raw) return []
      return JSON.parse(raw) as QRCode[]
    } catch {
      return []
    }
  }

  private saveStore(items: QRCode[]) {
    localStorage.setItem(STORAGE_KEYS.QR_CODES, JSON.stringify(items))
  }

  getAll(): QRCode[] {
    return this.getStore().sort((a, b) => {
      const numA = parseInt(a.qr_id, 10)
      const numB = parseInt(b.qr_id, 10)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      return a.qr_id.localeCompare(b.qr_id)
    })
  }

  getByQRId(qrId: string): QRCode | null {
    const formatted = formatQRId(qrId).toUpperCase()
    const all = this.getStore()
    return all.find((item) => item.qr_id.toUpperCase() === formatted) || null
  }

  insertMany(newCodes: QRCode[]): { success: boolean; inserted: QRCode[]; error?: string } {
    const existing = this.getStore()
    const existingIds = new Set(existing.map((x) => x.qr_id.toUpperCase()))

    for (const item of newCodes) {
      if (existingIds.has(item.qr_id.toUpperCase())) {
        return {
          success: false,
          inserted: [],
          error: `Duplicate QR ID conflict: ${item.qr_id} already exists in database.`,
        }
      }
    }

    const updated = [...existing, ...newCodes]
    this.saveStore(updated)
    return { success: true, inserted: newCodes }
  }

  update(qrId: string, updates: Partial<QRCode>): { success: boolean; updated?: QRCode; error?: string } {
    const formatted = formatQRId(qrId).toUpperCase()
    const store = this.getStore()
    const index = store.findIndex((item) => item.qr_id.toUpperCase() === formatted)
    if (index === -1) {
      return { success: false, error: `QR ID ${qrId} not found.` }
    }

    const now = new Date().toISOString()
    const current = store[index]
    const updatedItem: QRCode = {
      ...current,
      ...updates,
      updated_at: now,
    }

    store[index] = updatedItem
    this.saveStore(store)
    return { success: true, updated: updatedItem }
  }
}

const localEngine = new LocalStorageEngine()

export const dataProvider = {
  /**
   * Determine the configured Base URL for QR links.
   * Priority:
   * 1. Explicitly saved in localStorage or settings.
   * 2. VITE_VERCEL_DOMAIN or VITE_QR_DOMAIN in env.
   * 3. Current window.location.origin in browser.
   */
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
   * Check whether live Supabase is active
   */
  async checkSupabaseLive(): Promise<{ live: boolean; message: string }> {
    if (!isSupabaseConfigured()) {
      return {
        live: false,
        message: 'Supabase credentials are not configured in .env. Operating via secure local database vault.',
      }
    }

    try {
      const { data, error } = await supabase.from('qr_codes').select('qr_id').limit(1)
      if (error) {
        return {
          live: false,
          message: `Supabase query returned error: ${error.message}. Ensure supabase_schema.sql has been run.`,
        }
      }
      return {
        live: true,
        message: 'Connected to live Supabase PostgreSQL database.',
      }
    } catch (err: any) {
      return {
        live: false,
        message: `Failed to connect to Supabase: ${err.message || 'Network error'}`,
      }
    }
  },

  /**
   * Calculate dashboard metrics from database.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('qr_codes').select('status, organization_name')
        if (!error && data) {
          const totalQRCodes = data.length
          const availableQRCodes = data.filter((x: any) => x.status === 'Available').length
          const assignedQRCodes = data.filter((x: any) => x.status === 'Assigned').length
          const uniqueOrgs = new Set(
            data
              .filter((x: any) => x.status === 'Assigned' && x.organization_name)
              .map((x: any) => x.organization_name?.trim())
          )
          return {
            totalQRCodes,
            availableQRCodes,
            assignedQRCodes,
            totalOrganizations: uniqueOrgs.size,
          }
        }
      } catch (err) {
        console.warn('Fallback to local store for stats:', err)
      }
    }

    const all = localEngine.getAll()
    const totalQRCodes = all.length
    const availableQRCodes = all.filter((x) => x.status === 'Available').length
    const assignedQRCodes = all.filter((x) => x.status === 'Assigned').length
    const uniqueOrgs = new Set(
      all
        .filter((x) => x.status === 'Assigned' && x.organization_name)
        .map((x) => x.organization_name!.trim())
    )

    return {
      totalQRCodes,
      availableQRCodes,
      assignedQRCodes,
      totalOrganizations: uniqueOrgs.size,
    }
  },

  /**
   * Fetch QR codes with searching and filtering.
   */
  async getQRCodes(options: {
    search?: string
    statusFilter?: string
    page?: number
    pageSize?: number
  }): Promise<{ qrCodes: QRCode[]; total: number }> {
    const { search = '', statusFilter = 'all', page = 0, pageSize = 50 } = options

    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('qr_codes').select('*', { count: 'exact' })

        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter === 'available' ? 'Available' : statusFilter === 'assigned' ? 'Assigned' : statusFilter)
        }

        if (search && search.trim()) {
          const s = search.trim()
          query = query.or(`qr_id.ilike.%${s}%,organization_name.ilike.%${s}%,permanent_url.ilike.%${s}%`)
        }

        const from = page * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to).order('qr_id', { ascending: true })

        const { data, count, error } = await query
        if (!error && data) {
          return {
            qrCodes: data as QRCode[],
            total: count || data.length,
          }
        }
      } catch (err) {
        console.warn('Fallback to local store for list:', err)
      }
    }

    let items = localEngine.getAll()

    if (statusFilter && statusFilter !== 'all') {
      const target = statusFilter.toLowerCase()
      items = items.filter((x) => x.status.toLowerCase() === target)
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter(
        (x) =>
          x.qr_id.toLowerCase().includes(q) ||
          (x.organization_name && x.organization_name.toLowerCase().includes(q)) ||
          x.permanent_url.toLowerCase().includes(q)
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
   * Get single QR code by its unique ID (e.g. "001")
   */
  async getQRCodeByQRId(qrId: string): Promise<QRCode | null> {
    const formatted = formatQRId(qrId)

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('qr_codes')
          .select('*')
          .eq('qr_id', formatted)
          .maybeSingle()
        if (!error && data) {
          return data as QRCode
        }
      } catch (err) {
        console.warn('Fallback to local store for get:', err)
      }
    }

    return localEngine.getByQRId(formatted)
  },

  /**
   * Check range availability before generating.
   * Checks whether any IDs in the requested range are already taken.
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

    let existingIds = new Set<string>()

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from('qr_codes').select('qr_id')
        if (data) {
          existingIds = new Set(data.map((x: any) => String(x.qr_id).toUpperCase()))
        }
      } catch (err) {
        console.warn('Failed to query Supabase for range check:', err)
      }
    }

    if (existingIds.size === 0) {
      const all = localEngine.getAll()
      existingIds = new Set(all.map((x) => x.qr_id.toUpperCase()))
    }

    const conflicting = requestedIds.filter((id) => existingIds.has(id.toUpperCase()))

    // Calculate highest existing number to suggest next free start
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
   * Bulk QR URL Generation.
   * Creates permanent URLs and stores them in database.
   * Enforces uniqueness and never overwrites existing records.
   */
  async generateBulkQR(params: {
    startNumber: number
    quantity: number
    baseUrl?: string
  }): Promise<{
    success: boolean
    qrCodes: QRCode[]
    error?: string
  }> {
    const { startNumber, quantity, baseUrl = this.getBaseUrl() } = params

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
        error: `Requested range conflicts with existing records (${check.conflictingIds.slice(0, 5).join(', ')}${check.conflictingIds.length > 5 ? '...' : ''}). Next suggested starting number is ${formatQRId(check.nextAvailableStart)}.`,
      }
    }

    // 2. Prepare records
    const now = new Date().toISOString()
    const recordsToInsert: QRCode[] = []

    for (let i = 0; i < quantity; i++) {
      const currentNum = startNumber + i
      const qrId = formatQRId(currentNum)
      const permanentUrl = buildPermanentUrl(baseUrl, qrId)

      recordsToInsert.push({
        id: generateUUID(),
        qr_id: qrId,
        permanent_url: permanentUrl,
        organization_name: null,
        google_reviews_url: null,
        instagram_url: null,
        website_url: null,
        whatsapp_url: null,
        status: 'Available',
        created_at: now,
        updated_at: now,
        assigned_at: null,
      })
    }

    // 3. Persist to live Supabase if connected
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('qr_codes').insert(recordsToInsert).select()
        if (error) {
          return {
            success: false,
            qrCodes: [],
            error: `Database insertion failed: ${error.message}`,
          }
        }
        // Also keep local cache in sync
        localEngine.insertMany(recordsToInsert)
        return {
          success: true,
          qrCodes: (data as QRCode[]) || recordsToInsert,
        }
      } catch (err: any) {
        return {
          success: false,
          qrCodes: [],
          error: `Database network error: ${err.message || 'Operation failed'}`,
        }
      }
    }

    // Fallback: Local database vault
    const res = localEngine.insertMany(recordsToInsert)
    if (!res.success) {
      return { success: false, qrCodes: [], error: res.error }
    }

    return {
      success: true,
      qrCodes: recordsToInsert,
    }
  },

  /**
   * Configure an existing QR code.
   * Saves the organization name and four destination links.
   * Updates status to Assigned and preserves the permanent URL!
   */
  async configureQRCode(
    qrId: string,
    payload: {
      organization_name: string
      google_reviews_url?: string | null
      instagram_url?: string | null
      website_url?: string | null
      whatsapp_url?: string | null
    }
  ): Promise<{ success: boolean; qrCode?: QRCode; error?: string }> {
    const formattedId = formatQRId(qrId)

    // Validation
    const orgName = payload.organization_name?.trim()
    if (!orgName) {
      return { success: false, error: 'Organization Name is required.' }
    }

    if (payload.google_reviews_url && !isValidUrl(payload.google_reviews_url)) {
      return { success: false, error: 'Google Reviews URL must be a valid HTTP or HTTPS web address.' }
    }
    if (payload.instagram_url && !isValidUrl(payload.instagram_url)) {
      return { success: false, error: 'Instagram URL must be a valid HTTP or HTTPS web address.' }
    }
    if (payload.website_url && !isValidUrl(payload.website_url)) {
      return { success: false, error: 'Website URL must be a valid HTTP or HTTPS web address.' }
    }
    if (payload.whatsapp_url && !isValidUrl(payload.whatsapp_url)) {
      return { success: false, error: 'WhatsApp URL must be a valid HTTP or HTTPS web address.' }
    }

    const now = new Date().toISOString()
    const updates = {
      organization_name: orgName,
      google_reviews_url: payload.google_reviews_url?.trim() || null,
      instagram_url: payload.instagram_url?.trim() || null,
      website_url: payload.website_url?.trim() || null,
      whatsapp_url: payload.whatsapp_url?.trim() || null,
      status: 'Assigned' as QRStatus,
      assigned_at: now,
      updated_at: now,
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('qr_codes')
          .update(updates)
          .eq('qr_id', formattedId)
          .select()
          .single()

        if (error) {
          return { success: false, error: `Database update failed: ${error.message}` }
        }

        localEngine.update(formattedId, updates)
        return { success: true, qrCode: data as QRCode }
      } catch (err: any) {
        return { success: false, error: `Network error: ${err.message || 'Save failed'}` }
      }
    }

    const localRes = localEngine.update(formattedId, updates)
    if (!localRes.success) {
      return { success: false, error: localRes.error }
    }

    return { success: true, qrCode: localRes.updated }
  },

  /**
   * Public landing page lookup for /product/:id
   * Secure, narrow, public query.
   */
  async getPublicQRData(qrId: string): Promise<{
    status: 'Available' | 'Assigned' | 'not_found'
    qr_id: string
    organization_name?: string | null
    google_reviews_url?: string | null
    instagram_url?: string | null
    website_url?: string | null
    whatsapp_url?: string | null
  }> {
    const formattedId = formatQRId(qrId)

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('qr_codes')
          .select('qr_id, status, organization_name, google_reviews_url, instagram_url, website_url, whatsapp_url')
          .eq('qr_id', formattedId)
          .maybeSingle()

        if (!error && data) {
          return {
            status: data.status,
            qr_id: data.qr_id,
            organization_name: data.organization_name,
            google_reviews_url: data.google_reviews_url,
            instagram_url: data.instagram_url,
            website_url: data.website_url,
            whatsapp_url: data.whatsapp_url,
          }
        }
      } catch (err) {
        console.warn('Fallback to local store for public page:', err)
      }
    }

    const localItem = localEngine.getByQRId(formattedId)
    if (!localItem) {
      return { status: 'not_found', qr_id: formattedId }
    }

    return {
      status: localItem.status,
      qr_id: localItem.qr_id,
      organization_name: localItem.organization_name,
      google_reviews_url: localItem.google_reviews_url,
      instagram_url: localItem.instagram_url,
      website_url: localItem.website_url,
      whatsapp_url: localItem.whatsapp_url,
    }
  },
}
