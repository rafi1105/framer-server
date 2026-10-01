import { env } from "../src/config/env.js";
import { getSupabase } from "../src/db/supabase.js";

async function main() {
  console.log("--------------------------------------------------");
  console.log("🔍 Testing Supabase Configuration...");
  console.log("--------------------------------------------------");
  console.log("Project URL:", env.SUPABASE_URL);
  console.log("Service Key:", env.SUPABASE_SERVICE_ROLE_KEY ? "Configured (secret)" : "Not configured");
  console.log("Anon Key:", env.SUPABASE_ANON_KEY ? "Configured" : "Not configured");
  console.log("--------------------------------------------------");

  if (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_ANON_KEY) {
    console.error("❌ FAILED: Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_ANON_KEY is set in .env");
    console.log("\nSetup steps:");
    console.log("1. Open your Supabase project dashboard: https://supabase.com/dashboard");
    console.log("2. Navigate to Project Settings -> API.");
    console.log("3. Copy 'Project URL', 'anon public' key, and 'service_role' secret key into server/.env.");
    console.log("4. Run the SQL schema from 'supabase-schema.sql' in the Supabase SQL Editor.");
    process.exit(1);
  }

  try {
    const supabase = getSupabase();

    // 1. Test users table
    const { count: userCount, error: userError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (userError) {
      throw new Error(`Users table check failed: ${userError.message}`);
    }

    // 2. Test verification_codes table
    const { count: codeCount, error: codeError } = await supabase
      .from("verification_codes")
      .select("*", { count: "exact", head: true });

    if (codeError) {
      throw new Error(`Verification codes table check failed: ${codeError.message}`);
    }

    console.log("✅ SUCCESS: Connected to Supabase PostgreSQL database!");
    console.log(`• 'users' table reachable (total records: ${userCount ?? 0})`);
    console.log(`• 'verification_codes' table reachable (total records: ${codeCount ?? 0})`);
    process.exit(0);
  } catch (err: any) {
    console.error("❌ FAILED to connect to Supabase:", err?.message);
    console.log("\nTroubleshooting tips:");
    console.log("1. Ensure you have run 'supabase-schema.sql' in your Supabase SQL Editor.");
    console.log("2. Check that SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are correct.");
    console.log("3. Ensure your internet connection is active.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Diagnostic error:", err);
  process.exit(1);
});
