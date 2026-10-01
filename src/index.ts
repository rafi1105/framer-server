import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectToDatabase } from "./db/mongo.js";
import { verifySmtpConnection } from "./services/email.js";

async function startServer() {
  console.log("==========================================");
  console.log("🚀 Starting Qubtic Authentication Server...");
  console.log("==========================================");

  // Test MongoDB Connection
  try {
    await connectToDatabase();
    console.log("✅ MongoDB connected successfully to database:", env.MONGODB_DB_NAME);
  } catch (err: any) {
    console.warn("⚠️ MongoDB connection warning (will retry on incoming requests):", err?.message);
  }

  // Test SMTP Connection
  try {
    const smtpRes = await verifySmtpConnection();
    if (smtpRes.success) {
      console.log("✅ Mailgun SMTP ready:", smtpRes.message);
    } else {
      console.warn("⚠️ Mailgun SMTP warning:", smtpRes.message);
    }
  } catch (err: any) {
    console.warn("⚠️ SMTP check failed:", err?.message);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🌐 Server listening at http://localhost:${env.PORT}`);
    console.log(`📡 Health endpoint: http://localhost:${env.PORT}/api/health`);
    console.log("==========================================");
  });

  return server;
}

startServer().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
