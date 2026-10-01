import { env } from "../src/config/env.js";
import { connectToDatabase } from "../src/db/mongo.js";

async function main() {
  console.log("--------------------------------------------------");
  console.log("🔍 Testing MongoDB Configuration...");
  console.log("--------------------------------------------------");
  console.log("URI:", env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"));
  console.log("Database:", env.MONGODB_DB_NAME);
  console.log("--------------------------------------------------");

  try {
    const { client, db } = await connectToDatabase();
    const ping = await db.command({ ping: 1 });
    console.log("✅ SUCCESS: MongoDB ping response:", ping);

    const collections = await db.listCollections().toArray();
    console.log("Collections present:", collections.map((c) => c.name).join(", ") || "(none yet)");

    await client.close();
    process.exit(0);
  } catch (err: any) {
    console.error("❌ FAILED to connect to MongoDB:", err?.message);
    console.log("\nTroubleshooting tips:");
    console.log("1. For local development, make sure MongoDB is running (`mongod` or Docker container).");
    console.log("2. For Vercel cloud deployment, create a free MongoDB Atlas cluster and set MONGODB_URI to your mongodb+srv:// connection string.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Diagnostic error:", err);
  process.exit(1);
});
