import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { env } from "./config/env.js";

export const app: Express = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, Framer plugins)
      if (!origin) return callback(null, true);
      // In dev or if configured, allow all or specific origins
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (env.NODE_ENV !== "test") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Root ping
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Qubtic Authentication API",
    status: "online",
    docs: "/api/health",
  });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api", authRouter); // Also mount at /api for convenience (e.g. /api/health)

// Global 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: err?.message || "Internal server error",
  });
});
