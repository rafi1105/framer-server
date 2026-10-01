import { env } from "../src/config/env.js";
import { verifySmtpConnection, transporter } from "../src/services/email.js";

async function main() {
  console.log("--------------------------------------------------");
  console.log("🔍 Testing Mailgun SMTP Configuration...");
  console.log("--------------------------------------------------");
  console.log("Host:", env.SMTP_HOST);
  console.log("Port:", env.SMTP_PORT);
  console.log("Secure (TLS):", env.SMTP_SECURE);
  console.log("User:", env.SMTP_USER);
  console.log("Password:", env.SMTP_PASS ? "********" : "(not set)");
  console.log("From:", env.SMTP_FROM);
  console.log("--------------------------------------------------");

  console.log("Connecting to SMTP server...");
  const result = await verifySmtpConnection();

  if (result.success) {
    console.log("✅ SUCCESS:", result.message);
    console.log("Your Mailgun SMTP configuration is working and ready to send verification codes!");
    process.exit(0);
  } else {
    console.error("❌ FAILED:", result.message);
    console.log("\nTroubleshooting tips:");
    console.log("1. Check if the user/password in Mailgun settings match what was entered.");
    console.log("   URL: https://app.mailgun.com/mg/sending/qubtic.tech/settings?tab=settings");
    console.log("2. Domain credentials in Mailgun typically use 'postmaster@qubtic.tech' or an authorized SMTP user created in Mailgun.");
    console.log("3. If using port 587, ensure STARTTLS is permitted by your network firewall.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Diagnostic error:", err);
  process.exit(1);
});
