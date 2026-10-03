import { spawnSync } from "child_process";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const envVars: Record<string, string> = {
  NODE_ENV: "production",
  SUPABASE_URL: process.env.SUPABASE_URL || "https://karilwytxagagddlvlcw.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_DB_PASSWORD: (process.env.SUPABASE_DB_PASSWORD || "").replace(/"/g, ""),
  JWT_SECRET: process.env.JWT_SECRET || "",
  SMTP_HOST: process.env.SMTP_HOST || "smtp.mailgun.org",
  SMTP_PORT: process.env.SMTP_PORT || "587",
  SMTP_SECURE: process.env.SMTP_SECURE || "false",
  SMTP_USER: process.env.SMTP_USER || "hello@qubtic.tech",
  SMTP_PASS: (process.env.SMTP_PASS || "").replace(/"/g, ""),
  SMTP_FROM: (process.env.SMTP_FROM || "").replace(/"/g, ""),
  TEAM_NOTIFICATION_EMAIL: process.env.TEAM_NOTIFICATION_EMAIL || "hello@qubtic.tech",
  CLIENT_ORIGIN: "https://framer.com,https://app.framer.com,http://localhost:5173",
};

for (const [key, value] of Object.entries(envVars)) {
  if (!value) continue;
  console.log(`Setting ${key}...`);
  const res = spawnSync(
    "npx.cmd",
    ["vercel", "env", "add", key, '"production,preview"', "--value", `"${value}"`, "--force", "--yes"],
    { stdio: "inherit", shell: true }
  );
  if (res.status !== 0) {
    console.error(`Failed to set ${key} (code ${res.status})`);
  }
}

console.log("✅ All environment variables configured on Vercel!");
