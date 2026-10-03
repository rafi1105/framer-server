import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  createAndSaveVerificationCode,
  verifyCodeAndAuthenticate,
  getUserById,
  verifyToken,
} from "../services/auth.js";
import { sendVerificationEmail, sendNewUserTeamNotification, verifySmtpConnection } from "../services/email.js";
import { checkSupabaseConnection } from "../db/supabase.js";

export const authRouter = Router();

// Validation schemas
const sendCodeSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
});

const verifyCodeSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
  name: z.string().optional(),
  framerSiteId: z.string().optional(),
  framerSiteName: z.string().optional(),
  framerSiteUrl: z.string().optional(),
  framerUserId: z.string().optional(),
});

// POST /api/auth/send-code
authRouter.post("/send-code", async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = sendCodeSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || "Invalid input",
      });
      return;
    }

    const { email, name } = parseResult.data;
    const { code, expiresAt } = await createAndSaveVerificationCode(email, name);

    // Send email via Nodemailer
    try {
      await sendVerificationEmail(email, code, name);
    } catch (mailError: any) {
      console.error("Failed to send verification email:", mailError);
      res.status(500).json({
        success: false,
        error: `Could not send email to ${email}. Error: ${mailError?.message || "SMTP error"}`,
      });
      return;
    }

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}`,
      email,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: 600,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err?.message || "Failed to send verification code",
    });
  }
});

// POST /api/auth/verify-code
authRouter.post("/verify-code", async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = verifyCodeSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || "Invalid input",
      });
      return;
    }

    const { email, code, name, framerSiteId, framerSiteName, framerSiteUrl, framerUserId } = parseResult.data;
    const { user, token, isNewUser } = await verifyCodeAndAuthenticate(email, code, name, {
      framerSiteId,
      framerSiteName,
      framerSiteUrl,
      framerUserId,
    });

    // If new user signed up, dispatch team notification email with user details
    if (isNewUser) {
      const siteUrl = framerSiteUrl || (req.headers["origin"] || req.headers["referer"] || "frame-drop Framer Plugin")?.toString();
      sendNewUserTeamNotification(user, {
        origin: siteUrl,
        framerUserId: framerUserId,
        framerSiteUrl: siteUrl,
      }).catch((teamErr) => {
        console.warn("⚠️ Could not deliver team sign-up notification:", teamErr?.message);
      });
    }

    res.json({
      success: true,
      token,
      isNewUser,
      user: {
        id: user.id || user._id?.toString(),
        email: user.email,
        name: user.name,
        role: user.role || "user",
        createdAt: user.created_at || user.createdAt,
        lastLoginAt: user.last_login_at || user.lastLoginAt,
      },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err?.message || "Verification failed",
    });
  }
});

// GET /api/auth/me
authRouter.get("/me", async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    const user = await getUserById(payload.userId);

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id || user._id?.toString(),
        email: user.email,
        name: user.name,
        role: user.role || "user",
        createdAt: user.created_at || user.createdAt,
        lastLoginAt: user.last_login_at || user.lastLoginAt,
      },
    });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: "Invalid or expired session token",
    });
  }
});

// POST /api/auth/logout
authRouter.post("/logout", (_req: Request, res: Response): void => {
  res.json({ success: true, message: "Logged out successfully" });
});

// POST /api/auth/sync-site-info (Update framer_site_id, framer_site_name, framer_site_url)
authRouter.post("/sync-site-info", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, framerSiteId, framerSiteName, framerSiteUrl, framerUserId } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ success: false, error: "Valid email is required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (framerSiteId) updatePayload.framer_site_id = framerSiteId;
    if (framerSiteName) updatePayload.framer_site_name = framerSiteName;
    if (framerSiteUrl) updatePayload.framer_site_url = framerSiteUrl;

    const supabase = (await import("../db/supabase.js")).getSupabase();
    await supabase.from("users").update(updatePayload).eq("email", normalizedEmail);

    if (framerSiteId) {
      try {
        const { getOrCreateTrial } = await import("../services/tracking.js");
        await getOrCreateTrial({
          siteId: framerSiteId,
          siteName: framerSiteName,
          siteUrl: framerSiteUrl,
          framerUserId,
          email: normalizedEmail,
        });
      } catch (trialErr: any) {
        console.warn("⚠️ getOrCreateTrial notice during sync-site-info:", trialErr?.message);
      }
    }

    res.json({ success: true, message: "Framer site metadata synchronized successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to sync site info" });
  }
});

// GET /api/health
authRouter.get("/health", async (_req: Request, res: Response): Promise<void> => {
  const dbCheck = await checkSupabaseConnection();
  const dbStatus = dbCheck.connected ? "connected" : `disconnected (${dbCheck.message || "error"})`;
  const smtpStatus = await verifySmtpConnection();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "qubtic-auth-server",
    database: dbStatus,
    smtp: smtpStatus,
  });
});
