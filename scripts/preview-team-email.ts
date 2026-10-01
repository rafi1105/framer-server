import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateNewUserTeamNotificationEmailHtml } from "../src/services/email.js";
import { UserRecord } from "../src/db/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const sampleUser: UserRecord = {
    id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
    email: "alex.rivera@designstudio.io",
    name: "Alex Rivera",
    created_at: "2026-10-01T21:40:00Z",
    updated_at: "2026-10-01T21:40:00Z",
    last_login_at: "2026-10-01T21:40:00Z",
    role: "user",
  };

  const sampleMeta = {
    ip: "103.145.74.22 (Tokyo, Japan)",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Framer/2026.10",
    origin: "https://framer.com/projects/FrameKit-Pro",
  };

  const html = generateNewUserTeamNotificationEmailHtml(sampleUser, sampleMeta);
  const outputPath = path.resolve(__dirname, "../preview-team-notification.html");

  fs.writeFileSync(outputPath, html, "utf-8");

  console.log("--------------------------------------------------");
  console.log("✅ Team Notification Email Preview Generated!");
  console.log("--------------------------------------------------");
  console.log("Output File:", outputPath);
  console.log("Dispatch Target: hello@qubtic.com");
  console.log("Features:");
  console.log("  • Left Side: App Logo (FrameKit Framer Plugin)");
  console.log("  • Right Side: Company Logo (Qubtic Technologies)");
  console.log("  • Status Banner: Automatic Dispatch to hello@qubtic.com");
  console.log("  • User Spotlight Card with 1-Click 'Reply to User' mailto CTA");
  console.log("  • Compact Specification Grid (Supabase UUID & Telemetry)");
  console.log("--------------------------------------------------");
  console.log("You can double click or open 'preview-team-notification.html' in your browser to view the design!");
}

main().catch(console.error);
