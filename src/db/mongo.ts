import { MongoClient, Db, ObjectId } from "mongodb";
import { env } from "../config/env.js";

export interface UserDocument {
  _id?: ObjectId;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  role?: string;
}

export interface VerificationCodeDocument {
  _id?: ObjectId;
  email: string;
  codeHash: string;
  name?: string;
  expiresAt: Date;
  createdAt: Date;
  attempts: number;
  used: boolean;
}

// Global cached connection for Vercel serverless environments
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let indexesEnsured = false;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  const db = client.db(env.MONGODB_DB_NAME);

  cachedClient = client;
  cachedDb = db;

  if (!indexesEnsured) {
    try {
      // Create unique index on user emails
      await db.collection("users").createIndex({ email: 1 }, { unique: true });

      // Create TTL index on verification codes to auto-delete expired records
      await db.collection("verification_codes").createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );

      // Create index on email for quick lookup of active verification codes
      await db.collection("verification_codes").createIndex({ email: 1, used: 1 });

      indexesEnsured = true;
    } catch (err) {
      console.warn("MongoDB index creation warning:", err);
    }
  }

  return { client, db };
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}
