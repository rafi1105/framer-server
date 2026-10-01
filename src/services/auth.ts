import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getSupabase, UserRecord } from "../db/supabase.js";

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export function generateOtp(): string {
  // Generate a cryptographically secure 6-digit number string between 100000 and 999999
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

export async function createAndSaveVerificationCode(
  email: string,
  name?: string
): Promise<{ code: string; expiresAt: Date }> {
  const supabase = getSupabase();
  const normalizedEmail = email.toLowerCase().trim();

  // Check rate limit: ensure no code was sent within the last 60 seconds
  const sixtySecsAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("verification_codes")
    .select("created_at")
    .eq("email", normalizedEmail)
    .gt("created_at", sixtySecsAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) {
    const createdAtMs = new Date(recent.created_at).getTime();
    const waitSeconds = Math.max(1, Math.ceil((createdAtMs + 60 * 1000 - Date.now()) / 1000));
    throw new Error(`Please wait ${waitSeconds}s before requesting a new code.`);
  }

  const code = generateOtp();
  const codeHash = hashCode(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any older unused codes for this email
  await supabase
    .from("verification_codes")
    .update({ used: true })
    .eq("email", normalizedEmail)
    .eq("used", false);

  const { error: insertError } = await supabase
    .from("verification_codes")
    .insert({
      email: normalizedEmail,
      code_hash: codeHash,
      name: name?.trim() || null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      attempts: 0,
      used: false,
    });

  if (insertError) {
    throw new Error(`Failed to save verification code: ${insertError.message}`);
  }

  return { code, expiresAt };
}

export async function verifyCodeAndAuthenticate(
  email: string,
  code: string,
  name?: string
): Promise<{ user: UserRecord; token: string; isNewUser: boolean }> {
  const supabase = getSupabase();
  const normalizedEmail = email.toLowerCase().trim();
  const codeHash = hashCode(code);
  const now = new Date();

  const { data: record } = await supabase
    .from("verification_codes")
    .select("*")
    .eq("email", normalizedEmail)
    .eq("used", false)
    .gt("expires_at", now.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!record) {
    throw new Error("Verification code is invalid or has expired. Please request a new one.");
  }

  if (record.attempts >= 5) {
    await supabase
      .from("verification_codes")
      .update({ used: true })
      .eq("id", record.id);
    throw new Error("Too many incorrect attempts. Please request a new code.");
  }

  if (record.code_hash !== codeHash) {
    await supabase
      .from("verification_codes")
      .update({ attempts: record.attempts + 1 })
      .eq("id", record.id);
    throw new Error("Incorrect verification code. Please try again.");
  }

  // Mark code as used
  await supabase
    .from("verification_codes")
    .update({ used: true })
    .eq("id", record.id);

  // Find or create user
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  let user: UserRecord;
  let isNewUser = false;

  if (existingUser) {
    isNewUser = false;
    const updateData: Record<string, any> = {
      last_login_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    if (name && !existingUser.name) {
      updateData.name = name.trim();
    }
    const { data: updated } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", existingUser.id)
      .select()
      .single();

    user = updated || { ...existingUser, ...updateData };
  } else {
    isNewUser = true;
    const newUserData = {
      email: normalizedEmail,
      name: name?.trim() || record.name || normalizedEmail.split("@")[0],
      role: "user",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      last_login_at: now.toISOString(),
    };
    const { data: created, error: insertError } = await supabase
      .from("users")
      .insert(newUserData)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create user: ${insertError.message}`);
    }
    user = created;
  }

  // Populate helper aliases
  user.createdAt = user.created_at;
  user.updatedAt = user.updated_at;
  user.lastLoginAt = user.last_login_at || undefined;
  user._id = user.id;

  const token = signToken({
    userId: user.id,
    email: user.email,
  });

  return { user, token, isNewUser };
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  const supabase = getSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return null;
  user.createdAt = user.created_at;
  user.updatedAt = user.updated_at;
  user.lastLoginAt = user.last_login_at || undefined;
  user._id = user.id;
  return user;
}
