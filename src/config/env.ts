import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("4000").transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SUPABASE_URL: z.string().default("https://your-project.supabase.co"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  SUPABASE_ANON_KEY: z.string().default(""),
  JWT_SECRET: z.string().default("qubtic_secret_jwt_key_default_2026"),
  SMTP_HOST: z.string().default("smtp.mailgun.org"),
  SMTP_PORT: z.string().default("587").transform((val) => parseInt(val, 10)),
  SMTP_SECURE: z.string().default("false").transform((val) => val === "true"),
  SMTP_USER: z.string().default("qubticpro@gmail.com"),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default('"frame-drop by Qubtic" <noreply@qubtic.com>'),
  TEAM_NOTIFICATION_EMAIL: z.string().default("hello@qubtic.com"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  FRONTEND_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
