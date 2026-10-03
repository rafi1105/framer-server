import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export interface UserRecord {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  plan?: string | null;
  subscription_status?: string | null;
  plugin_name?: string | null;
  framer_site_id?: string | null;
  framer_site_name?: string | null;
  framer_site_url?: string | null;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
  // Compatibility fields
  createdAt?: string | Date;
  updatedAt?: string | Date;
  lastLoginAt?: string | Date;
  _id?: string;
}

// Backwards compatibility alias
export type UserDocument = UserRecord;

export interface VerificationCodeRecord {
  id: string;
  email: string;
  code_hash: string;
  name?: string | null;
  plugin_name?: string | null;
  attempts: number;
  used: boolean;
  expires_at: string;
  created_at: string;
}

export type VerificationCodeDocument = VerificationCodeRecord;

export interface FramedropTrialRecord {
  id: string;
  site_id: string;
  plugin_name: string;
  email?: string | null;
  site_name?: string | null;
  site_url?: string | null;
  framer_user_id?: string | null;
  trial_start: string;
  trial_end: string;
  components_added: number;
  current_plan_status: string; // 'trialing' | 'active' | 'expired' | 'inactive'
  created_at: string;
  updated_at: string;
}

export interface FramedropEventRecord {
  id: string;
  site_id: string;
  plugin_name: string;
  framer_user_id?: string | null;
  email?: string | null;
  event_type: string;
  event_data?: Record<string, any>;
  created_at: string;
}

let cachedClient: SupabaseClient | null = null;

/**
 * Returns a singleton instance of the Supabase Client.
 * Prefers SUPABASE_SERVICE_ROLE_KEY for server operations, falls back to SUPABASE_ANON_KEY.
 */
export function getSupabase(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || "missing-supabase-key";

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

/**
 * Check connectivity to Supabase by pinging the users table
 */
export async function checkSupabaseConnection(): Promise<{ connected: boolean; message?: string }> {
  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_ANON_KEY) {
      return {
        connected: false,
        message: "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is not configured in .env",
      };
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      return { connected: false, message: error.message };
    }

    return { connected: true };
  } catch (err: any) {
    return { connected: false, message: err?.message || "Unknown Supabase error" };
  }
}
