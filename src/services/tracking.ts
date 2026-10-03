import { getSupabase, FramedropTrialRecord } from "../db/supabase.js";

export const DEFAULT_PLUGIN_NAME = "frame-drop";

export interface TrialStatusResult {
  success: boolean;
  isPaid: boolean;
  plan: string;
  status: string;
  isTrial: boolean;
  isTrialActive: boolean;
  trialEndsAt: string;
  trialDaysRemaining: number;
  componentsAdded: number;
  siteId: string;
  pluginName: string;
  siteName?: string | null;
  siteUrl?: string | null;
  email?: string | null;
  framerUserId?: string | null;
}

/**
 * Normalizes email address for consistent indexing.
 */
function normalizeEmail(email?: string | null): string | null {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Finds or initializes a 7-day free trial for a Framer project.
 */
export async function getOrCreateTrial(params: {
  siteId: string;
  pluginName?: string;
  siteName?: string | null;
  siteUrl?: string | null;
  framerUserId?: string | null;
  email?: string | null;
}): Promise<FramedropTrialRecord> {
  const supabase = getSupabase();
  const normalizedEmail = normalizeEmail(params.email);
  const pluginName = params.pluginName?.trim() || DEFAULT_PLUGIN_NAME;
  const now = new Date();

  // 1. Try to find existing trial by (site_id, plugin_name)
  const { data: existing, error: selectErr } = await supabase
    .from("framedrop_trials")
    .select("*")
    .eq("site_id", params.siteId)
    .eq("plugin_name", pluginName)
    .maybeSingle();

  if (selectErr) {
    console.warn("⚠️ Error checking framedrop_trials by site_id & plugin_name:", selectErr.message);
  }

  if (existing) {
    let needsUpdate = false;
    const updatePayload: Record<string, any> = {
      updated_at: now.toISOString(),
    };

    if (params.siteName && params.siteName !== existing.site_name) {
      updatePayload.site_name = params.siteName;
      needsUpdate = true;
    }
    if (params.siteUrl && params.siteUrl !== existing.site_url) {
      updatePayload.site_url = params.siteUrl;
      needsUpdate = true;
    }
    if (normalizedEmail && normalizedEmail !== existing.email) {
      updatePayload.email = normalizedEmail;
      needsUpdate = true;
    }
    if (params.framerUserId && params.framerUserId !== existing.framer_user_id) {
      updatePayload.framer_user_id = params.framerUserId;
      needsUpdate = true;
    }

    // Check expiration status
    const trialEnd = new Date(existing.trial_end);
    if (trialEnd <= now && existing.current_plan_status === "trialing") {
      updatePayload.current_plan_status = "expired";
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { data: updated } = await supabase
        .from("framedrop_trials")
        .update(updatePayload)
        .eq("id", existing.id)
        .select()
        .single();
      return (updated as FramedropTrialRecord) || { ...existing, ...updatePayload };
    }

    return existing as FramedropTrialRecord;
  }

  // 2. Create a new 7-day trial record
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const newTrialData = {
    site_id: params.siteId,
    plugin_name: pluginName,
    site_name: params.siteName || "Framer Project",
    site_url: params.siteUrl || "https://framer.app",
    email: normalizedEmail,
    framer_user_id: params.framerUserId || null,
    trial_start: now.toISOString(),
    trial_end: trialEnd.toISOString(),
    components_added: 0,
    current_plan_status: "trialing",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const { data: created, error: insertErr } = await supabase
    .from("framedrop_trials")
    .insert(newTrialData)
    .select()
    .single();

  if (insertErr) {
    console.error("❌ Failed to create framedrop_trials record:", insertErr.message);
    throw new Error(`Failed to initialize trial: ${insertErr.message}`);
  }

  // Also update user's profile if user exists
  if (normalizedEmail) {
    await supabase
      .from("users")
      .update({
        framer_site_id: params.siteId,
        framer_site_name: params.siteName || null,
        framer_site_url: params.siteUrl || null,
        plugin_name: pluginName,
        subscription_status: "trialing",
        updated_at: now.toISOString(),
      })
      .eq("email", normalizedEmail);
  }

  return created as FramedropTrialRecord;
}

/**
 * Tracks component insertions and plugin events, incrementing components_added.
 * Uses atomic Postgres RPC 'track_plugin_usage' when available for race-condition safety.
 */
export async function trackComponentUsage(params: {
  siteId: string;
  pluginName?: string;
  siteName?: string | null;
  siteUrl?: string | null;
  framerUserId?: string | null;
  email?: string | null;
  count?: number;
  eventType?: string;
  eventData?: Record<string, any>;
}): Promise<{ trial: FramedropTrialRecord; componentsAdded: number }> {
  const supabase = getSupabase();
  const pluginName = params.pluginName?.trim() || DEFAULT_PLUGIN_NAME;
  const increment = Math.max(1, params.count ?? 1);

  // 1. Try atomic PostgreSQL RPC first
  try {
    const { data: rpcTrial, error: rpcErr } = await supabase.rpc("track_plugin_usage", {
      p_site_id: params.siteId,
      p_plugin_name: pluginName,
      p_site_name: params.siteName || null,
      p_site_url: params.siteUrl || null,
      p_framer_user_id: params.framerUserId || null,
      p_email: normalizeEmail(params.email) || null,
      p_count: increment,
      p_event_type: params.eventType || "insert_section",
      p_event_data: params.eventData || {},
    });

    if (!rpcErr && rpcTrial) {
      return {
        trial: rpcTrial as FramedropTrialRecord,
        componentsAdded: rpcTrial.components_added,
      };
    }
  } catch (rpcEx) {
    // Fall back to client-side queries if RPC function isn't yet migrated
  }

  // 2. Fallback execution path
  const trial = await getOrCreateTrial({
    siteId: params.siteId,
    pluginName,
    siteName: params.siteName,
    siteUrl: params.siteUrl,
    framerUserId: params.framerUserId,
    email: params.email,
  });

  const newComponentsCount = (trial.components_added || 0) + increment;
  const now = new Date();

  // Increment usage count in trial record
  const { data: updatedTrial, error: updateErr } = await supabase
    .from("framedrop_trials")
    .update({
      components_added: newComponentsCount,
      updated_at: now.toISOString(),
    })
    .eq("id", trial.id)
    .select()
    .single();

  if (updateErr) {
    console.warn("⚠️ Failed to increment components_added in trial:", updateErr.message);
  }

  // Record audit event in framedrop_events
  try {
    await supabase.from("framedrop_events").insert({
      site_id: params.siteId,
      plugin_name: pluginName,
      framer_user_id: params.framerUserId || trial.framer_user_id || null,
      email: normalizeEmail(params.email) || trial.email || null,
      event_type: params.eventType || "insert_section",
      event_data: {
        count: increment,
        totalComponents: newComponentsCount,
        ...(params.eventData || {}),
      },
      created_at: now.toISOString(),
    });
  } catch (eventErr: any) {
    console.warn("⚠️ Failed to log framedrop_event:", eventErr?.message);
  }

  return {
    trial: (updatedTrial as FramedropTrialRecord) || { ...trial, components_added: newComponentsCount },
    componentsAdded: newComponentsCount,
  };
}

/**
 * Connectfic-compatible subscription / trial status lookup.
 * Frontend calls this on startup or navigation.
 */
export async function getSubscriptionStatus(params: {
  siteId: string;
  pluginName?: string;
  userId?: string | null;
  email?: string | null;
  componentsCount?: number | null;
  siteName?: string | null;
  siteUrl?: string | null;
}): Promise<TrialStatusResult> {
  const supabase = getSupabase();
  const pluginName = params.pluginName?.trim() || DEFAULT_PLUGIN_NAME;
  const now = new Date();

  const trial = await getOrCreateTrial({
    siteId: params.siteId,
    pluginName,
    siteName: params.siteName,
    siteUrl: params.siteUrl,
    framerUserId: params.userId,
    email: params.email,
  });

  // If frontend passed an updated componentsCount higher than database, synchronize it
  let currentCount = trial.components_added || 0;
  if (
    params.componentsCount !== undefined &&
    params.componentsCount !== null &&
    params.componentsCount > currentCount
  ) {
    currentCount = params.componentsCount;
    await supabase
      .from("framedrop_trials")
      .update({
        components_added: currentCount,
        updated_at: now.toISOString(),
      })
      .eq("id", trial.id);
  }

  const trialEnd = new Date(trial.trial_end);
  const msRemaining = trialEnd.getTime() - now.getTime();
  const isTrialActive = msRemaining > 0;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  const effectiveStatus = isTrialActive
    ? trial.current_plan_status || "trialing"
    : "expired";

  return {
    success: true,
    isPaid: false, // Stripe not added yet
    plan: effectiveStatus,
    status: effectiveStatus,
    isTrial: true,
    isTrialActive,
    trialEndsAt: trial.trial_end,
    trialDaysRemaining: daysRemaining,
    componentsAdded: currentCount,
    siteId: trial.site_id,
    pluginName,
    siteName: trial.site_name,
    siteUrl: trial.site_url,
    email: trial.email,
    framerUserId: trial.framer_user_id,
  };
}
