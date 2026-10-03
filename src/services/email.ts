import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { UserRecord, UserDocument } from "../db/supabase.js";
import { FRAMEDROP_ICON_BASE64, QUBTIC_ICON_BASE64 } from "./logoAssets.js";

export const FRAMEDROP_CID = "hello@qubtic.tech";

// Clean raw base64 buffer for inline CID attachment
const framedropPngBuffer = Buffer.from(
  FRAMEDROP_ICON_BASE64.replace(/^data:image\/\w+;base64,/, ""),
  "base64"
);

export const emailAttachments = [
  {
    filename: "framedrop-logo.png",
    content: framedropPngBuffer,
    cid: FRAMEDROP_CID,
    contentType: "image/png",
    contentDisposition: "inline" as const,
  },
];

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE, // false for port 587
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: env.NODE_ENV === "production",
  },
});

export async function verifySmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    await transporter.verify();
    return { success: true, message: `SMTP connected successfully to ${env.SMTP_HOST}:${env.SMTP_PORT}` };
  } catch (error: any) {
    return { success: false, message: error?.message || "Failed to verify SMTP connection" };
  }
}

/**
 * 1. Account Verification Email Template (Sent to User)
 * Branded with Qubtic Primary Color: #164E33 (Deep Forest Emerald)
 */
export function generateVerificationEmailHtml(
  code: string,
  recipientName?: string,
  logoSrc: string = `cid:${FRAMEDROP_CID}`
): string {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Frame Drop Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #F1F5F3; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (520px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border: 1px solid #D1DDD6; border-radius: 18px; overflow: hidden; box-shadow: 0 16px 36px -10px rgba(22, 78, 51, 0.15);">
          
          <!-- BRAND TOP BAR (#164E33) -->
          <tr>
            <td style="background-color: #164E33; padding: 18px 28px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle" style="padding-right: 12px; width: 36px;">
                          <img src="${logoSrc}" alt="Frame Drop" width="36" height="36" style="display: block; width: 36px; height: 36px; border-radius: 9px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); border: 0; outline: none; text-decoration: none;" />
                        </td>
                        <td valign="middle">
                          <div style="font-size: 16px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.8px; line-height: 18px;">Frame Drop</div>
                          <div style="font-size: 9px; font-weight: 700; color: #86EFAC; letter-spacing: 1.5px; text-transform: uppercase;">BY QUBTIC TECHNOLOGIES</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 4px 10px; background: rgba(255, 255, 255, 0.12); border-radius: 6px; font-size: 11px; font-weight: 600; color: #F0FDF4;">
                      SECURE SIGN-IN
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO CARD -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; background: linear-gradient(180deg, #EAF7F0 0%, #FFFFFF 100%); border-bottom: 1px solid #E2E8F0;">
              <div style="width: 52px; height: 52px; margin: 0 auto 16px auto; background: #DCFCE7; border: 2px solid #164E33; border-radius: 50%; text-align: center; line-height: 52px;">
                <span style="font-size: 24px; color: #164E33; line-height: 52px; display: inline-block;">⚡</span>
              </div>
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #0F291C; letter-spacing: -0.4px;">
                Your Sign-In Verification Code
              </h1>
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #475569;">
                ${greeting} enter the 6-digit code below into your <strong>Frame Drop</strong> plugin in Framer to complete authentication.
              </p>
            </td>
          </tr>

          <!-- OTP CODE BOX -->
          <tr>
            <td style="padding: 24px 32px;">
              <div style="background-color: #F8FAF9; border: 2px dashed #164E33; border-radius: 14px; padding: 22px 16px; text-align: center; margin-bottom: 20px;">
                <div style="font-family: 'SF Mono', Monaco, 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #164E33; display: inline-block; padding-left: 10px;">
                  ${code}
                </div>
                <div style="margin-top: 8px; font-size: 11px; font-weight: 600; color: #64748B; letter-spacing: 0.8px; text-transform: uppercase;">
                  Single-Use Passcode &bull; Valid for 10 Minutes
                </div>
              </div>

              <!-- NOTICE -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #EAF7F0; border-left: 4px solid #164E33; border-radius: 6px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 14px;">
                    <p style="margin: 0; font-size: 12.5px; line-height: 19px; color: #164E33;">
                      ⏳ <strong>Time-Sensitive:</strong> For security reasons, this code will expire automatically in 10 minutes. Do not share this code with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748B; text-align: center;">
                If you did not request this email, you can safely ignore it. Your account remains completely secure.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #164E33; padding: 20px 32px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #FFFFFF;">
                Frame Drop &bull; Native Framer Component Suite
              </p>
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #86EFAC;">
                &copy; ${new Date().getFullYear()} Qubtic Technologies. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 10.5px; color: #A7F3D0;">
                <a href="https://qubtic.tech" style="color: #FFFFFF; text-decoration: underline;" target="_blank">qubtic.tech</a> &bull; Secure Authentication Service
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 2. Team Notification Email Template (Sent to Qubtic Team on New Sign Up)
 * Executive modular card design based on reference layout (Nishar Multani / Basis card layout)
 * Primary Brand Color: #164E33 (Deep Forest Emerald)
 *
 * Focuses on clean, actionable user identity data without unneeded device/IP trackers:
 * - User Full Name
 * - User Email Address
 * - Supabase Account UUID
 * - Access Tier & Permissions
 * - Verification Timestamp & Status
 * - Database Synchronization State
 */
export function generateNewUserTeamNotificationEmailHtml(
  user: UserDocument,
  meta?: { origin?: string; framerUserId?: string; framerSiteUrl?: string },
  logoSrc: string = `cid:${FRAMEDROP_CID}`
): string {
  const dateRaw = user.created_at || user.createdAt;
  const now = dateRaw ? new Date(dateRaw) : new Date();

  // Clean date & time formats
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const formattedDate = now.toLocaleDateString("en-US", dateOptions);
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  const userName = user.name && user.name.trim() !== "" ? user.name.trim() : "Not specified";
  const userEmail = user.email;
  const userId = user.id || user._id?.toString() || "Auto-assigned";
  const shortId = userId.length > 8 ? userId.substring(0, 8).toUpperCase() : userId.toUpperCase();
  const userRole = (user.role || "user").toUpperCase();
  const framerUserId = meta?.framerUserId && meta.framerUserId.trim() !== "" ? meta.framerUserId.trim() : "usr_framer_studio";
  const framerSiteUrl = meta?.framerSiteUrl || meta?.origin || "https://framer.com/projects/Frame Drop-Studio";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Member Provisioned - Qubtic Team Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #EEF2F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #EEF2F0; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- 540px Executive Modular Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #D1DDD6; border-radius: 18px; overflow: hidden; box-shadow: 0 18px 40px -12px rgba(22, 78, 51, 0.18);">
          
          <!-- 1. TOP BRAND HEADER BAR (#164E33) -->
          <tr>
            <td style="background-color: #164E33; padding: 18px 24px; border-bottom: 2px solid #0E3622;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <!-- Left: Qubtic 3D Brand Badge -->
                  <td align="left" valign="middle">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle" style="padding-right: 12px; width: 38px;">
                          <img src="${logoSrc}" alt="Frame Drop" width="38" height="38" style="display: block; width: 38px; height: 38px; border-radius: 9px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35); border: 0; outline: none; text-decoration: none;" />
                        </td>
                        <td valign="middle">
                          <div style="font-size: 16px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.8px; line-height: 18px;">Frame Drop</div>
                          <div style="font-size: 9px; font-weight: 700; color: #86EFAC; letter-spacing: 1.5px; text-transform: uppercase;">QUBTIC TECHNOLOGIES HQ</div>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Right: Live Timestamp / Date -->
                  <td align="right" valign="middle">
                    <div style="font-size: 11px; font-weight: 600; color: #E2E8F0; letter-spacing: -0.2px;">
                      ${formattedDate}
                    </div>
                    <div style="font-size: 9.5px; color: #86EFAC; margin-top: 2px; font-family: monospace;">
                      ${formattedTime}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 2. HERO STATUS CARD (Patterned Soft-Mint Background with Centered Badge) -->
          <tr>
            <td style="padding: 28px 24px 24px 24px; background: linear-gradient(180deg, #EAF7F0 0%, #F5FBF7 100%); border-bottom: 1px solid #D5E5DC; text-align: center;">
              
              <!-- Circular Status Badge Icon -->
              <div style="width: 48px; height: 48px; margin: 0 auto 12px auto; background-color: #FFFFFF; border: 2px solid #164E33; border-radius: 50%; text-align: center; line-height: 48px; box-shadow: 0 6px 14px rgba(22, 78, 51, 0.12);">
                <span style="font-size: 22px; color: #164E33; line-height: 48px; display: inline-block;">✓</span>
              </div>

              <!-- Main Title -->
              <h1 style="margin: 0 0 6px 0; font-size: 21px; font-weight: 800; color: #0F291C; letter-spacing: -0.3px;">
                New Member Provisioned
              </h1>
              
              <!-- Subtitle -->
              <p style="margin: 0 0 18px 0; font-size: 13.5px; line-height: 20px; color: #475569; max-width: 420px; margin-left: auto; margin-right: auto;">
                A new user has successfully verified their identity via passwordless OTP and joined the <strong>Frame Drop</strong> platform.
              </p>

              <!-- Action Bar (Two Side-by-Side Pills) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <!-- Left Pill: User ID Reference -->
                  <td valign="middle" style="padding-right: 8px;">
                    <div style="padding: 8px 14px; background-color: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 11.5px; font-weight: 700; color: #334155; font-family: monospace;">
                      <span style="color: #164E33; font-weight: 800;">ID:</span> #${shortId}
                    </div>
                  </td>
                  <!-- Right Pill: 1-Click "Reply to Member" Button -->
                  <td valign="middle">
                    <a href="mailto:${userEmail}" style="display: inline-block; padding: 8px 16px; background-color: #164E33; color: #FFFFFF; font-size: 11.5px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 10px rgba(22, 78, 51, 0.25);">
                      ✉ Reply to Member
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- 3. MAIN CONTENT BODY (Modular Cards) -->
          <tr>
            <td style="padding: 22px 24px;">

              <!-- SECTION 1: MEMBER REGISTRATION SUMMARY -->
              <div style="background-color: #F8FAF9; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 18px; margin-bottom: 16px;">
                <div style="font-size: 10.5px; font-weight: 800; color: #164E33; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
                  MEMBER PROFILE & IDENTITY
                </div>
                
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748B; font-weight: 500; width: 130px;">Full Name</td>
                    <td style="padding: 6px 0; font-size: 13px; color: #0F172A; font-weight: 700;">${userName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748B; font-weight: 500;">Email Address</td>
                    <td style="padding: 6px 0; font-size: 13px; color: #164E33; font-weight: 700; font-family: monospace;">${userEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748B; font-weight: 500;">Account UUID</td>
                    <td style="padding: 6px 0; font-size: 11.5px; color: #475569; font-family: monospace;">${userId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748B; font-weight: 500;">Framer User ID</td>
                    <td style="padding: 6px 0; font-size: 11.5px; color: #0F172A; font-weight: 600; font-family: monospace;">
                      <span style="display: inline-block; padding: 2px 7px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 4px;">
                        ${framerUserId}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748B; font-weight: 500;">Framer Site URL</td>
                    <td style="padding: 6px 0; font-size: 12px; color: #164E33; font-weight: 600; word-break: break-all;">
                      <a href="${framerSiteUrl}" style="color: #164E33; text-decoration: underline;" target="_blank">
                        ${framerSiteUrl}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748B; font-weight: 500;">Access Role</td>
                    <td style="padding: 6px 0; font-size: 12px;">
                      <span style="display: inline-block; padding: 2px 8px; background-color: #DCFCE7; border: 1px solid #86EFAC; border-radius: 4px; font-size: 10px; font-weight: 700; color: #164E33;">
                        ${userRole} &bull; FRAME-KIT PRO
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748B; font-weight: 500;">Auth Verification</td>
                    <td style="padding: 6px 0; font-size: 12px; color: #16A34A; font-weight: 600;">
                      ✓ 6-Digit Passwordless OTP (Verified)
                    </td>
                  </tr>
                </table>
              </div>



              <!-- SECTION 4: DIRECT OUTREACH STRIP (Inspired by "Text us" box) -->
              <div style="background-color: #F8FAF9; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 16px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="24" valign="middle" style="padding-right: 8px;">
                      <span style="font-size: 16px; line-height: 20px;">💬</span>
                    </td>
                    <td valign="middle">
                      <span style="font-size: 11.5px; color: #475569;">
                        Need to assist this user? Click <strong>"Reply to Member"</strong> above or message them directly at <strong style="color: #164E33;">${userEmail}</strong>.
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- 4. BOTTOM FOOTER BAR (#164E33) -->
          <tr>
            <td style="background-color: #164E33; padding: 22px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              
              <!-- Quick Links -->
              <div style="margin-bottom: 10px;">
                <a href="https://qubtic.tech" style="color: #E2E8F0; text-decoration: none; font-size: 11px; font-weight: 700; margin: 0 8px; letter-spacing: 0.5px;" target="_blank">PORTAL</a>
                <span style="color: #86EFAC; font-size: 10px;">&bull;</span>
                <a href="mailto:hello@qubtic.tech" style="color: #E2E8F0; text-decoration: none; font-size: 11px; font-weight: 700; margin: 0 8px; letter-spacing: 0.5px;">SUPPORT</a>
                <span style="color: #86EFAC; font-size: 10px;">&bull;</span>
                <a href="https://qubtic.tech/privacy" style="color: #E2E8F0; text-decoration: none; font-size: 11px; font-weight: 700; margin: 0 8px; letter-spacing: 0.5px;" target="_blank">PRIVACY</a>
                <span style="color: #86EFAC; font-size: 10px;">&bull;</span>
                <a href="https://qubtic.tech/terms" style="color: #E2E8F0; text-decoration: none; font-size: 11px; font-weight: 700; margin: 0 8px; letter-spacing: 0.5px;" target="_blank">TERMS</a>
              </div>

              <!-- Copyright & Brand Lockup -->
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #FFFFFF;">
                Qubtic Technologies &bull; frame-drop Pro Platform
              </p>
              <p style="margin: 0; font-size: 10px; color: #86EFAC;">
                &copy; ${now.getFullYear()} Qubtic Technologies. All rights reserved. Automated Team Notification.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send Verification Email to User with OTP
 */
export async function sendVerificationEmail(
  to: string,
  code: string,
  name?: string
): Promise<{ messageId: string }> {
  const html = generateVerificationEmailHtml(code, name);
  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `Your Frame Drop Verification Code: ${code} (Qubtic)`,
    text: `Your Frame Drop (by Qubtic) verification code is ${code}. It expires in 10 minutes.`,
    html,
    attachments: emailAttachments,
  });

  return { messageId: info.messageId };
}

/**
 * Send Team Notification Email when a New User Signs Up
 * Automatically dispatched to TEAM_NOTIFICATION_EMAIL (e.g. hello@qubtic.tech)
 */
export async function sendNewUserTeamNotification(
  user: UserDocument,
  meta?: { origin?: string; framerUserId?: string; framerSiteUrl?: string }
): Promise<{ messageId: string }> {
  const html = generateNewUserTeamNotificationEmailHtml(user, meta);
  const targetEmail = env.TEAM_NOTIFICATION_EMAIL || "hello@qubtic.tech";

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to: targetEmail,
    subject: `🚀 New Member: ${user.name || user.email} via Frame Drop | Qubtic Team Alert`,
    text: `New member registered on Frame Drop (Qubtic)!\nEmail: ${user.email}\nName: ${user.name || "N/A"}\nID: ${user.id || user._id?.toString()}\nRegistered: ${user.created_at || user.createdAt}\nNotification sent to: ${targetEmail}`,
    html,
    attachments: emailAttachments,
  });

  return { messageId: info.messageId };
}
