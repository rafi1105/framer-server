import { CorsOptions } from "cors";
import { env } from "./env.js";

/**
 * CORS Configuration matched to Connectfic reference implementation
 * Specifically tailored for:
 * 1. Framer Canvas sandboxed iframes (origin === 'null')
 * 2. Framer plugin runtimes (*.framer.com, *.framer.app, *.framercanvas.com, etc.)
 * 3. Local development environments (localhost & 127.0.0.1 on any port)
 * 4. Qubtic & Frame Drop production domains (*.qubtic.tech, *.qubtic.com)
 * 5. Configured custom frontend origins (CLIENT_ORIGIN / FRONTEND_URL)
 */

const rawOrigins = [env.CLIENT_ORIGIN, env.FRONTEND_URL].filter(Boolean).join(",");

export const configuredFrontendOrigins: string[] = rawOrigins
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      return value;
    }
  });

export const allowedOriginSuffixes: string[] = [
  ".framer.com",
  ".framer.app",
  ".framercanvas.com",
  ".framer.website",
  ".framerusercontent.com",
  ".framefic.com",
  ".framercdn.com",
  ".qubtic.tech",
  ".qubtic.com",
];

export const isAllowedOrigin = (origin: string): boolean => {
  // Allow requests from localhost or 127.0.0.1 on any port (Vite, Next.js, local Framer)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return true;
  }

  // Allow explicitly configured frontend origins from environment
  if (configuredFrontendOrigins.includes(origin)) {
    return true;
  }

  // Allow known Framer, Framefic, and Qubtic domains
  try {
    const { hostname } = new URL(origin);
    return allowedOriginSuffixes.some((suffix) => {
      const cleanSuffix = suffix.startsWith(".") ? suffix.slice(1) : suffix;
      return hostname === cleanSuffix || hostname.endsWith(`.${cleanSuffix}`);
    });
  } catch {
    return false;
  }
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    // 2. Allow sandboxed "null" origin. Framer plugin runtimes surface as "null" origin in sandboxed canvas contexts.
    if (!origin || origin === "null") {
      return callback(null, true);
    }

    // Allow configured frontend origins and known Framer / Qubtic domains
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn(`⚠️ CORS rejected origin: ${origin}`);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 200,
};
