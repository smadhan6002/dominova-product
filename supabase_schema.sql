-- ====================================================================
-- DOMINOVA — Dynamic QR Management System
-- Production Supabase Database Schema & Row Level Security (RLS)
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. QR CODES TABLE (Core Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.qr_codes (
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

-- Supporting Profiles Table (Admin accounts)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'operator')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Supporting Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. INDEXES FOR LIGHTNING FAST LOOKUPS
CREATE INDEX IF NOT EXISTS idx_qr_codes_qr_id ON public.qr_codes(qr_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_organization_name ON public.qr_codes(organization_name);
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON public.qr_codes(created_at DESC);

-- 4. AUTO-UPDATE UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_qr_codes_updated_at ON public.qr_codes;
CREATE TRIGGER set_qr_codes_updated_at
  BEFORE UPDATE ON public.qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- QR Codes: Authenticated administrators have full CRUD access
DROP POLICY IF EXISTS "Authenticated admins can manage qr_codes" ON public.qr_codes;
CREATE POLICY "Authenticated admins can manage qr_codes" ON public.qr_codes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- QR Codes: Public visitors can view records for public landing page
DROP POLICY IF EXISTS "Public visitors can view qr_codes" ON public.qr_codes;
CREATE POLICY "Public visitors can view qr_codes" ON public.qr_codes
  FOR SELECT TO anon USING (true);

-- Profiles: Authenticated users can read profiles
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Authenticated can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Settings: Authenticated administrators can manage settings
DROP POLICY IF EXISTS "Authenticated admins can manage settings" ON public.settings;
CREATE POLICY "Authenticated admins can manage settings" ON public.settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. STORED PROCEDURE FOR NARROW PUBLIC LOOKUP
CREATE OR REPLACE FUNCTION public.get_public_qr_data(p_qr_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_qr RECORD;
BEGIN
  SELECT qr_id, status, organization_name, google_reviews_url, instagram_url, website_url, whatsapp_url
  INTO v_qr
  FROM public.qr_codes
  WHERE UPPER(qr_id) = UPPER(p_qr_id)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'qr_id', p_qr_id);
  END IF;

  RETURN jsonb_build_object(
    'status', v_qr.status,
    'qr_id', v_qr.qr_id,
    'organization_name', v_qr.organization_name,
    'google_reviews_url', v_qr.google_reviews_url,
    'instagram_url', v_qr.instagram_url,
    'website_url', v_qr.website_url,
    'whatsapp_url', v_qr.whatsapp_url
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_public_qr_data(TEXT) TO anon, authenticated;
