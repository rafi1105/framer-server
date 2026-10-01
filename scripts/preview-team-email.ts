import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ObjectId } from "mongodb";
import { generateNewUserTeamNotificationEmailHtml } from "../src/services/email.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const sampleUser = {
    _id: new ObjectId("6700f1a9b2c3d4e5f6789012"),
    email: "alex.rivera@designstudio.io",
    name: "Alex Rivera",
    createdAt: new Date("2026-10-01T21:40:00Z"),
    updatedAt: new Date("2026-10-01T21:40:00Z"),
    lastLoginAt: new Date("2026-10-01T21:40:00Z"),
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
  console.log("  • Comprehensive Account & Telemetry Specification Grid");
  console.log("  • Team Quick Links (Email, Qubtic Portal, Documentation)");
  console.log("--------------------------------------------------");
  console.log("You can double click or open 'preview-team-notification.html' in your browser to view the design!");
}

main().catch(console.error);
