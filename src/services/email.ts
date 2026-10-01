import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { UserDocument } from "../db/mongo.js";

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
 * Prominently features Qubtic (Company) and FrameKit (Plugin)
 */
export function generateVerificationEmailHtml(code: string, recipientName?: string): string {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your FrameKit Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080a10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #080a10; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background: linear-gradient(180deg, #121826 0%, #0d121c 100%); border: 1px solid #1f293d; border-radius: 20px; overflow: hidden; box-shadow: 0 28px 56px -12px rgba(0, 0, 0, 0.7), 0 0 40px -8px rgba(99, 102, 241, 0.25);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.18) 0%, transparent 70%);">
              <!-- Qubtic & FrameKit Lockup -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center">
                    <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%); border-radius: 12px; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4); margin-bottom: 12px;">
                      <span style="font-size: 22px; line-height: 44px; display: block;">⚡</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; text-transform: uppercase;">
                      FRAMEKIT
                    </div>
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #818cf8; text-transform: uppercase; margin-top: 4px;">
                      BY QUBTIC TECHNOLOGIES
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 40px;">
              <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 700; color: #ffffff; text-align: center; letter-spacing: -0.3px;">
                Passwordless Sign-In Code
              </h1>
              
              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 23px; color: #94a3b8; text-align: center;">
                ${greeting} enter the 6-digit code below into your <strong>FrameKit</strong> plugin in Framer to verify your account.
              </p>

              <!-- High-Contrast Segmented OTP Code Box -->
              <div style="background-color: #07090e; border: 1.5px solid #4f46e5; border-radius: 14px; padding: 24px 16px; text-align: center; margin: 0 0 28px 0; box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.25);">
                <div style="font-family: 'SF Mono', 'Courier New', Courier, monospace; font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #c7d2fe; text-shadow: 0 0 24px rgba(99, 102, 241, 0.7); display: inline-block; padding-left: 12px;">
                  ${code}
                </div>
                <div style="margin-top: 10px; font-size: 11.5px; color: #64748b; letter-spacing: 0.5px;">
                  CLICK AND COPY OR TYPE DIRECTLY INTO FRAMEKIT
                </div>
              </div>

              <!-- Expiration Note -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td style="background: rgba(99, 102, 241, 0.08); border-left: 3px solid #6366f1; border-radius: 6px; padding: 14px 16px;">
                    <p style="margin: 0; font-size: 12.5px; line-height: 19px; color: #a5b4fc;">
                      ⏳ <strong>Time-sensitive:</strong> This code expires in <strong>10 minutes</strong> and can only be used once.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 19px; color: #64748b; text-align: center;">
                If you did not request this email, no further action is required. Your account remains completely secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px 40px; background-color: #090c14; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #cbd5e1;">
                FrameKit &bull; Native Framer Component Suite
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #64748b;">
                &copy; ${new Date().getFullYear()} <strong>Qubtic Technologies</strong>. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                <a href="https://qubtic.tech" style="color: #818cf8; text-decoration: none;" target="_blank">qubtic.tech</a> &bull; Secure Authentication Service
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
 * Dual-branded executive design:
 * - Left side: App Logo (FrameKit Framer Plugin)
 * - Right side: Company Logo (Qubtic Technologies)
 * Automatically sent to hello@qubtic.tech with complete user specifications.
 */
export function generateNewUserTeamNotificationEmailHtml(
  user: UserDocument,
  meta?: { ip?: string; userAgent?: string; origin?: string }
): string {
  const formattedDate = user.createdAt ? new Date(user.createdAt).toUTCString() : new Date().toUTCString();
  const userName = user.name || "Not provided";
  const userEmail = user.email;
  const userId = user._id?.toString() || "Auto-generated";
  const clientOrigin = meta?.origin || "FrameKit Plugin for Framer";
  const clientIp = meta?.ip || "Not recorded";
  const clientAgent = meta?.userAgent || "FrameKit Webview / Browser";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New User Sign Up - FrameKit | Qubtic</title>
</head>
<body style="margin: 0; padding: 0; background-color: #05070c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #05070c; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background: linear-gradient(180deg, #0e1424 0%, #090e18 100%); border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 28px 60px -12px rgba(0, 0, 0, 0.8), 0 0 45px -8px rgba(0, 153, 255, 0.18);">
          
          <!-- DUAL BRANDED TOP HEADER: Left App Logo (FrameKit) & Right Company Logo (Qubtic) -->
          <tr>
            <td style="padding: 28px 36px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: radial-gradient(circle at 50% 0%, rgba(0, 153, 255, 0.12) 0%, rgba(16, 185, 129, 0.08) 55%, transparent 100%);">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <!-- LEFT SIDE: APP LOGO (FrameKit) -->
                  <td align="left" valign="middle" style="width: 50%;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle" style="padding-right: 12px;">
                          <!-- App Icon Badge -->
                          <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #0099ff 0%, #4338ca 100%); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.22); box-shadow: 0 6px 18px rgba(0, 153, 255, 0.35); text-align: center; line-height: 44px;">
                            <span style="font-size: 22px; color: #ffffff; display: inline-block; vertical-align: middle; line-height: 44px;">⚡</span>
                          </div>
                        </td>
                        <td valign="middle">
                          <div style="font-size: 19px; font-weight: 800; color: #ffffff; letter-spacing: -0.4px; line-height: 22px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            FrameKit
                          </div>
                          <div style="font-size: 9.5px; font-weight: 700; color: #38bdf8; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px;">
                            FRAMER PLUGIN APP
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- RIGHT SIDE: COMPANY LOGO (Qubtic) -->
                  <td align="right" valign="middle" style="width: 50%;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="right" style="margin-left: auto;">
                      <tr>
                        <td valign="middle" align="right" style="padding-right: 12px;">
                          <div style="font-size: 19px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; line-height: 22px; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            QUBTIC
                          </div>
                          <div style="font-size: 9.5px; font-weight: 700; color: #34d399; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; text-align: right;">
                            TECHNOLOGIES HQ
                          </div>
                        </td>
                        <td valign="middle" align="right">
                          <!-- Company Icon Badge -->
                          <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.22); box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35); text-align: center; line-height: 44px;">
                            <span style="font-size: 22px; color: #ffffff; display: inline-block; vertical-align: middle; line-height: 44px;">◆</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ALERT BANNER -->
          <tr>
            <td style="padding: 32px 36px 20px 36px; text-align: center;">
              <div style="display: inline-block; padding: 6px 16px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 20px; font-size: 10.5px; font-weight: 700; color: #34d399; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 12px;">
                🟢 NEW USER REGISTERED &bull; AUTOMATIC DISPATCH
              </div>
              <h1 style="margin: 0 0 8px 0; font-size: 25px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 32px;">
                FrameKit Team Alert
              </h1>
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #94a3b8;">
                A new user completed passwordless verification and registered on FrameKit.<br>
                Dispatched automatically to <strong style="color: #cbd5e1;">hello@qubtic.tech</strong>.
              </p>
            </td>
          </tr>

          <!-- USER SPOTLIGHT HERO CARD -->
          <tr>
            <td style="padding: 0 36px 24px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, rgba(0, 153, 255, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%); border: 1px solid rgba(0, 153, 255, 0.28); border-radius: 14px; padding: 22px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);">
                <tr>
                  <td width="56" valign="middle">
                    <div style="width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #0099ff 0%, #10b981 100%); display: flex; align-items: center; justify-content: center; text-align: center; line-height: 52px; font-size: 22px; font-weight: 800; color: #ffffff; box-shadow: 0 4px 14px rgba(0, 153, 255, 0.35);">
                      ${userEmail.charAt(0).toUpperCase()}
                    </div>
                  </td>
                  <td style="padding-left: 18px;" valign="middle">
                    <div style="font-size: 17px; font-weight: 800; color: #ffffff; line-height: 23px;">
                      ${userName !== "Not provided" ? userName : userEmail.split("@")[0]}
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #7dd3fc; margin-top: 2px; font-family: monospace;">
                      ${userEmail}
                    </div>
                    <div style="font-size: 11.5px; color: #34d399; font-weight: 600; margin-top: 4px;">
                      ✓ Verified Account &bull; Role: ${user.role || "user"}
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <a href="mailto:${userEmail}" style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #0099ff 0%, #0284c7 100%); color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 153, 255, 0.3); border: 1px solid rgba(255, 255, 255, 0.2);" target="_blank">
                      Reply to User
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- USER DETAILS GRID -->
          <tr>
            <td style="padding: 0 36px 28px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <span style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">
                      User Account Specifications
                    </span>
                  </td>
                </tr>
              </table>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #070b13; border: 1px solid #1e293b; border-radius: 12px; border-collapse: separate; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 12px; color: #64748b; font-weight: 600; width: 140px;">
                    Full Name
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 13px; color: #ffffff; font-weight: 600;">
                    ${userName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 12px; color: #64748b; font-weight: 600;">
                    Email Address
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 13px; color: #38bdf8; font-weight: 600; font-family: monospace;">
                    <a href="mailto:${userEmail}" style="color: #38bdf8; text-decoration: none;">${userEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 12px; color: #64748b; font-weight: 600;">
                    MongoDB User ID
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 12px; color: #cbd5e1; font-family: monospace;">
                    ${userId}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 12px; color: #64748b; font-weight: 600;">
                    Registered At
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 12.5px; color: #cbd5e1;">
                    ${formattedDate}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 12px; color: #64748b; font-weight: 600;">
                    Platform / Origin
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 12.5px; color: #cbd5e1;">
                    ${clientOrigin}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 12px; color: #64748b; font-weight: 600;">
                    Client IP Address
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 12px; color: #94a3b8; font-family: monospace;">
                    ${clientIp}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 12px; color: #64748b; font-weight: 600;">
                    Client User-Agent
                  </td>
                  <td style="padding: 12px 18px; border-bottom: 1px solid #1e293b; font-size: 11px; color: #64748b; line-height: 16px; word-break: break-all;">
                    ${clientAgent}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 18px; font-size: 12px; color: #64748b; font-weight: 600;">
                    Dispatch Target
                  </td>
                  <td style="padding: 12px 18px; font-size: 12px; color: #34d399; font-weight: 600;">
                    hello@qubtic.com (Qubtic Core Team)
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- QUICK TEAM ACTIONS -->
          <tr>
            <td style="padding: 0 36px 32px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 18px;">
                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px; font-weight: 600;">
                      QUBTIC TEAM QUICK LINKS
                    </div>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="padding: 0 6px;">
                          <a href="mailto:${userEmail}" style="display: inline-block; padding: 8px 14px; background: rgba(0, 153, 255, 0.12); border: 1px solid rgba(0, 153, 255, 0.3); color: #38bdf8; text-decoration: none; font-size: 11.5px; font-weight: 700; border-radius: 6px;">
                            ✉️ Email Creator
                          </a>
                        </td>
                        <td style="padding: 0 6px;">
                          <a href="https://qubtic.com" style="display: inline-block; padding: 8px 14px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; text-decoration: none; font-size: 11.5px; font-weight: 700; border-radius: 6px;" target="_blank">
                            🌐 Qubtic Portal
                          </a>
                        </td>
                        <td style="padding: 0 6px;">
                          <a href="https://qubtic.tech" style="display: inline-block; padding: 8px 14px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); color: #cbd5e1; text-decoration: none; font-size: 11.5px; font-weight: 700; border-radius: 6px;" target="_blank">
                            📚 Documentation
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 24px 36px 32px 36px; background-color: #060910; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06);">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #cbd5e1; letter-spacing: 0.3px;">
                FrameKit &bull; Native Framer Component Suite
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #64748b;">
                Internal Confidential Notification &bull; Delivered automatically to <a href="mailto:hello@qubtic.com" style="color: #818cf8; text-decoration: none;">hello@qubtic.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; ${new Date().getFullYear()} <strong>Qubtic Technologies</strong>. All rights reserved. &bull; <a href="https://qubtic.com" style="color: #38bdf8; text-decoration: none;" target="_blank">qubtic.com</a>
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
    subject: `Your FrameKit Verification Code: ${code} (Qubtic)`,
    text: `Your FrameKit (by Qubtic) verification code is ${code}. It expires in 10 minutes.`,
    html,
  });

  return { messageId: info.messageId };
}

/**
 * Send Team Notification Email when a New User Signs Up
 * Automatically dispatched to hello@qubtic.com
 */
export async function sendNewUserTeamNotification(
  user: UserDocument,
  meta?: { ip?: string; userAgent?: string; origin?: string }
): Promise<{ messageId: string }> {
  const html = generateNewUserTeamNotificationEmailHtml(user, meta);
  const targetEmail = env.TEAM_NOTIFICATION_EMAIL || "hello@qubtic.com";

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to: targetEmail,
    subject: `🚀 New User Sign Up: ${user.name || user.email} via FrameKit | Qubtic Team Alert`,
    text: `New user sign up on FrameKit (Qubtic)!\nEmail: ${user.email}\nName: ${user.name || "N/A"}\nID: ${user._id?.toString()}\nRegistered: ${user.createdAt}\nNotification sent to: ${targetEmail}`,
    html,
  });

  return { messageId: info.messageId };
}
