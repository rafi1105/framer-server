-- ============================================================
-- frame-drop (by Qubtic) - Supabase Production Database Schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ============================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' NOT NULL,
  plan TEXT DEFAULT 'free' NOT NULL,
  subscription_status TEXT DEFAULT 'inactive' NOT NULL,
  plugin_name TEXT DEFAULT 'frame-drop' NOT NULL,
  framer_site_id TEXT,
  framer_site_name TEXT,
  framer_site_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_login_at TIMESTAMPTZ,
  CONSTRAINT check_users_role CHECK (role IN ('user', 'admin', 'editor', 'team')),
  CONSTRAINT check_users_email CHECK (email = lower(trim(email)))
);

-- Fast indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_plugin ON public.users(plugin_name);

-- Idempotent migrations for existing deployments
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plugin_name TEXT DEFAULT 'frame-drop';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS framer_site_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS framer_site_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS framer_site_url TEXT;

-- Auto update timestamp trigger
DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 3. VERIFICATION CODES TABLE (Passwordless OTP Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  name TEXT,
  plugin_name TEXT DEFAULT 'frame-drop' NOT NULL,
  attempts INT DEFAULT 0 NOT NULL,
  used BOOLEAN DEFAULT false NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_verification_attempts CHECK (attempts >= 0)
);

ALTER TABLE public.verification_codes ADD COLUMN IF NOT EXISTS plugin_name TEXT DEFAULT 'frame-drop';

-- Fast indexes for OTP validation & rate-limiting lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup 
  ON public.verification_codes(email, used, expires_at);

CREATE INDEX IF NOT EXISTS idx_verification_codes_rate_limit 
  ON public.verification_codes(email, created_at DESC);

-- ============================================================
-- 4. FRAMEDROP TRIALS & USAGE TRACKING (Multi-Plugin Compatible)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.framedrop_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  plugin_name TEXT DEFAULT 'frame-drop' NOT NULL,
  site_name TEXT,
  site_url TEXT,
  framer_user_id TEXT,
  email TEXT,
  trial_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  trial_end TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days'),
  components_added INT DEFAULT 0 NOT NULL,
  current_plan_status TEXT DEFAULT 'trialing' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_components_non_negative CHECK (components_added >= 0),
  CONSTRAINT check_valid_plan_status CHECK (current_plan_status IN ('trialing', 'active', 'expired', 'canceled', 'inactive'))
);

ALTER TABLE public.framedrop_trials ADD COLUMN IF NOT EXISTS plugin_name TEXT DEFAULT 'frame-drop';

-- Drop legacy single site_id unique index if it exists and replace with composite (site_id, plugin_name)
DROP INDEX IF EXISTS public.idx_framedrop_trials_site_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_framedrop_trials_site_plugin_unique 
  ON public.framedrop_trials(site_id, plugin_name);

CREATE INDEX IF NOT EXISTS idx_framedrop_trials_email_plugin 
  ON public.framedrop_trials(email, plugin_name);

CREATE INDEX IF NOT EXISTS idx_framedrop_trials_framer_user 
  ON public.framedrop_trials(framer_user_id);

CREATE INDEX IF NOT EXISTS idx_framedrop_trials_status 
  ON public.framedrop_trials(current_plan_status);

-- Auto update timestamp trigger
DROP TRIGGER IF EXISTS trigger_framedrop_trials_updated_at ON public.framedrop_trials;
CREATE TRIGGER trigger_framedrop_trials_updated_at
  BEFORE UPDATE ON public.framedrop_trials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 5. FRAMEDROP EVENTS TABLE (Detailed Insertion & Action Telemetry)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.framedrop_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  plugin_name TEXT DEFAULT 'frame-drop' NOT NULL,
  framer_user_id TEXT,
  email TEXT,
  event_type TEXT NOT NULL, -- e.g. 'insert_section', 'insert_page', 'token_sync'
  event_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.framedrop_events ADD COLUMN IF NOT EXISTS plugin_name TEXT DEFAULT 'frame-drop';

CREATE INDEX IF NOT EXISTS idx_framedrop_events_site_plugin 
  ON public.framedrop_events(site_id, plugin_name);

CREATE INDEX IF NOT EXISTS idx_framedrop_events_email 
  ON public.framedrop_events(email);

CREATE INDEX IF NOT EXISTS idx_framedrop_events_type_created 
  ON public.framedrop_events(event_type, created_at DESC);

-- ============================================================
-- 6. ATOMIC USAGE TRACKING FUNCTION (High-Concurrency Safe)
-- ============================================================
CREATE OR REPLACE FUNCTION public.track_plugin_usage(
  p_site_id TEXT,
  p_plugin_name TEXT DEFAULT 'frame-drop',
  p_site_name TEXT DEFAULT NULL,
  p_site_url TEXT DEFAULT NULL,
  p_framer_user_id TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_count INT DEFAULT 1,
  p_event_type TEXT DEFAULT 'insert_section',
  p_event_data JSONB DEFAULT '{}'::jsonb
)
RETURNS public.framedrop_trials
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trial public.framedrop_trials;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_norm_email TEXT := NULL;
  v_increment INT := GREATEST(1, COALESCE(p_count, 1));
BEGIN
  IF p_email IS NOT NULL AND TRIM(p_email) <> '' THEN
    v_norm_email := LOWER(TRIM(p_email));
  END IF;

  -- Atomic Upsert with non-conflicting increment
  INSERT INTO public.framedrop_trials (
    site_id,
    plugin_name,
    site_name,
    site_url,
    framer_user_id,
    email,
    trial_start,
    trial_end,
    components_added,
    current_plan_status,
    created_at,
    updated_at
  )
  VALUES (
    p_site_id,
    COALESCE(p_plugin_name, 'frame-drop'),
    COALESCE(p_site_name, 'Framer Project'),
    COALESCE(p_site_url, 'https://framer.app'),
    p_framer_user_id,
    v_norm_email,
    v_now,
    v_now + INTERVAL '7 days',
    v_increment,
    'trialing',
    v_now,
    v_now
  )
  ON CONFLICT (site_id, plugin_name)
  DO UPDATE SET
    components_added = public.framedrop_trials.components_added + v_increment,
    site_name = COALESCE(EXCLUDED.site_name, public.framedrop_trials.site_name),
    site_url = COALESCE(EXCLUDED.site_url, public.framedrop_trials.site_url),
    framer_user_id = COALESCE(EXCLUDED.framer_user_id, public.framedrop_trials.framer_user_id),
    email = COALESCE(v_norm_email, public.framedrop_trials.email),
    updated_at = v_now,
    current_plan_status = CASE
      WHEN public.framedrop_trials.trial_end <= v_now AND public.framedrop_trials.current_plan_status = 'trialing'
      THEN 'expired'
      ELSE public.framedrop_trials.current_plan_status
    END
  RETURNING * INTO v_trial;

  -- Record audit event
  INSERT INTO public.framedrop_events (
    site_id,
    plugin_name,
    framer_user_id,
    email,
    event_type,
    event_data,
    created_at
  )
  VALUES (
    p_site_id,
    COALESCE(p_plugin_name, 'frame-drop'),
    p_framer_user_id,
    v_norm_email,
    COALESCE(p_event_type, 'insert_section'),
    jsonb_build_object('count', v_increment, 'total_components', v_trial.components_added) || COALESCE(p_event_data, '{}'::jsonb),
    v_now
  );

  -- Link site info to user if user exists
  IF v_norm_email IS NOT NULL THEN
    UPDATE public.users
    SET
      framer_site_id = p_site_id,
      framer_site_name = COALESCE(p_site_name, framer_site_name),
      framer_site_url = COALESCE(p_site_url, framer_site_url),
      plugin_name = COALESCE(p_plugin_name, plugin_name),
      updated_at = v_now
    WHERE email = v_norm_email;
  END IF;

  RETURN v_trial;
END;
$$;

-- ============================================================
-- 7. CLEANUP EXPIRED VERIFICATION CODES HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.verification_codes
  WHERE expires_at < timezone('utc'::text, now()) - INTERVAL '1 day';
END;
$$;

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS) & ACCESS POLICIES
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.framedrop_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.framedrop_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow server access to users" ON public.users;
DROP POLICY IF EXISTS "Allow server access to verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow server access to framedrop trials" ON public.framedrop_trials;
DROP POLICY IF EXISTS "Allow server access to framedrop events" ON public.framedrop_events;

CREATE POLICY "Allow server access to users" ON public.users
  FOR ALL TO authenticated, anon, service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow server access to verification codes" ON public.verification_codes
  FOR ALL TO authenticated, anon, service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow server access to framedrop trials" ON public.framedrop_trials
  FOR ALL TO authenticated, anon, service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow server access to framedrop events" ON public.framedrop_events
  FOR ALL TO authenticated, anon, service_role USING (true) WITH CHECK (true);

-- Permissions grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
