-- ============================================================
-- FrameKit (by Qubtic) - Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ============================================================

-- 1. Create USERS table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_login_at TIMESTAMPTZ
);

-- Index for fast user lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. Create VERIFICATION_CODES table (for passwordless OTP auth)
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  name TEXT,
  attempts INT DEFAULT 0 NOT NULL,
  used BOOLEAN DEFAULT false NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fast indexes for code validation & rate-limiting lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup 
  ON public.verification_codes(email, used, expires_at);

CREATE INDEX IF NOT EXISTS idx_verification_codes_rate_limit 
  ON public.verification_codes(email, created_at);

-- 3. Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Server backend using service_role key has full bypass access.
-- If using anon key, allow server policies:
CREATE POLICY "Allow server access to users" ON public.users
  FOR ALL
  TO authenticated, anon, service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow server access to verification codes" ON public.verification_codes
  FOR ALL
  TO authenticated, anon, service_role
  USING (true)
  WITH CHECK (true);

-- 4. Optional helper: Clean up expired codes older than 24 hours
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.verification_codes
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$;
