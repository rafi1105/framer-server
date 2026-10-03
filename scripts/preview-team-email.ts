import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateNewUserTeamNotificationEmailHtml, generateVerificationEmailHtml } from "../src/services/email.js";
import { FRAMEDROP_ICON_BASE64 } from "../src/services/logoAssets.js";
import { UserRecord } from "../src/db/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const sampleUser: UserRecord = {
    id: "e59e2a8b-94f3-4014-a3e0-bbeb0e2d4eda",
    email: "alex.rivera@designstudio.io",
    name: "Alex Rivera",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
    role: "pro",
  };

  const sampleMeta = {
    origin: "https://framer.com/projects/frame-drop-Pro-Studio",
    framerUserId: "usr_7x9k2p_alexrivera",
    framerSiteUrl: "https://framer.com/projects/frame-drop-Pro-Studio",
  };

  // 1. Team Notification Email (using base64 for local browser preview)
  const teamHtml = generateNewUserTeamNotificationEmailHtml(sampleUser, sampleMeta, FRAMEDROP_ICON_BASE64);
  const teamOutputPath = path.resolve(__dirname, "../preview-team-notification.html");
  fs.writeFileSync(teamOutputPath, teamHtml, "utf-8");

  // 2. User OTP Verification Email (using base64 for local browser preview)
  const otpHtml = generateVerificationEmailHtml("849201", "Alex Rivera", FRAMEDROP_ICON_BASE64);
  const otpOutputPath = path.resolve(__dirname, "../preview-user-otp.html");
  fs.writeFileSync(otpOutputPath, otpHtml, "utf-8");

  console.log("==================================================");
  console.log("✨ Qubtic Email Templates Generated (#164E33)");
  console.log("==================================================");
  console.log("1. Team Notification Preview:");
  console.log("   Path:", teamOutputPath);
  console.log("   Brand Color: #164E33 (Deep Forest Emerald)");
  console.log("   Layout: Executive Status Card & Member Summary Grid");
  console.log("   User Data: Name, Email, Account UUID, Tier, Supabase Sync Status");
  console.log("   CTAs: Direct 'Reply to Member' mailto link");
  console.log("\n2. User Verification OTP Preview:");
  console.log("   Path:", otpOutputPath);
  console.log("==================================================");
}

main().catch(console.error);
