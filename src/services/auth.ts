import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getDb, UserDocument, VerificationCodeDocument } from "../db/mongo.js";
import { ObjectId } from "mongodb";

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
  const db = await getDb();
  const normalizedEmail = email.toLowerCase().trim();

  // Check rate limit: ensure no code was sent within the last 60 seconds
  const recent = await db.collection<VerificationCodeDocument>("verification_codes").findOne({
    email: normalizedEmail,
    createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
  });

  if (recent) {
    const waitSeconds = Math.ceil(
      (recent.createdAt.getTime() + 60 * 1000 - Date.now()) / 1000
    );
    throw new Error(`Please wait ${waitSeconds}s before requesting a new code.`);
  }

  const code = generateOtp();
  const codeHash = hashCode(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any older unused codes for this email
  await db.collection<VerificationCodeDocument>("verification_codes").updateMany(
    { email: normalizedEmail, used: false },
    { $set: { used: true } }
  );

  await db.collection<VerificationCodeDocument>("verification_codes").insertOne({
    email: normalizedEmail,
    codeHash,
    name: name?.trim(),
    createdAt: now,
    expiresAt,
    attempts: 0,
    used: false,
  });

  return { code, expiresAt };
}

export async function verifyCodeAndAuthenticate(
  email: string,
  code: string,
  name?: string
): Promise<{ user: UserDocument; token: string; isNewUser: boolean }> {
  const db = await getDb();
  const normalizedEmail = email.toLowerCase().trim();
  const codeHash = hashCode(code);

  const record = await db.collection<VerificationCodeDocument>("verification_codes").findOne({
    email: normalizedEmail,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    throw new Error("Verification code is invalid or has expired. Please request a new one.");
  }

  if (record.attempts >= 5) {
    await db.collection<VerificationCodeDocument>("verification_codes").updateOne(
      { _id: record._id },
      { $set: { used: true } }
    );
    throw new Error("Too many incorrect attempts. Please request a new code.");
  }

  if (record.codeHash !== codeHash) {
    await db.collection<VerificationCodeDocument>("verification_codes").updateOne(
      { _id: record._id },
      { $inc: { attempts: 1 } }
    );
    throw new Error("Incorrect verification code. Please try again.");
  }

  // Mark code as used
  await db.collection<VerificationCodeDocument>("verification_codes").updateOne(
    { _id: record._id },
    { $set: { used: true } }
  );

  // Find or create user
  const now = new Date();
  const existingUser = await db.collection<UserDocument>("users").findOne({
    email: normalizedEmail,
  });

  let user: UserDocument;
  let isNewUser = false;

  if (existingUser) {
    isNewUser = false;
    await db.collection<UserDocument>("users").updateOne(
      { _id: existingUser._id },
      {
        $set: {
          lastLoginAt: now,
          updatedAt: now,
          ...(name && !existingUser.name ? { name: name.trim() } : {}),
        },
      }
    );
    user = {
      ...existingUser,
      lastLoginAt: now,
      updatedAt: now,
      ...(name && !existingUser.name ? { name: name.trim() } : {}),
    };
  } else {
    isNewUser = true;
    const newUser: UserDocument = {
      email: normalizedEmail,
      name: name?.trim() || record.name || normalizedEmail.split("@")[0],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      role: "user",
    };
    const insertResult = await db.collection<UserDocument>("users").insertOne(newUser);
    user = { ...newUser, _id: insertResult.insertedId };
  }

  const token = signToken({
    userId: user._id!.toString(),
    email: user.email,
  });

  return { user, token, isNewUser };
}

export async function getUserById(userId: string): Promise<UserDocument | null> {
  const db = await getDb();
  return db.collection<UserDocument>("users").findOne({ _id: new ObjectId(userId) });
}
