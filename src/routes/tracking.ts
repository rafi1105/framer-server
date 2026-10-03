import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  getSubscriptionStatus,
  trackComponentUsage,
  getOrCreateTrial,
} from "../services/tracking.js";

export const trackingRouter = Router();

// Validation schemas with pluginName support
const subscriptionStatusQuerySchema = z.object({
  siteId: z.string().min(1, "siteId is required"),
  pluginName: z.string().default("frame-drop"),
  userId: z.string().optional(),
  email: z.string().optional(),
  componentsCount: z.coerce.number().optional(),
  siteName: z.string().optional(),
  siteUrl: z.string().optional(),
});

const trackUsageSchema = z.object({
  siteId: z.string().min(1, "siteId is required"),
  pluginName: z.string().default("frame-drop"),
  siteName: z.string().optional(),
  siteUrl: z.string().optional(),
  framerUserId: z.string().optional(),
  email: z.string().optional(),
  count: z.number().int().min(1).default(1),
  eventType: z.string().default("insert_section"),
  eventData: z.record(z.any()).optional(),
});

const startTrialSchema = z.object({
  siteId: z.string().min(1, "siteId is required"),
  pluginName: z.string().default("frame-drop"),
  siteName: z.string().optional(),
  siteUrl: z.string().optional(),
  framerUserId: z.string().optional(),
  email: z.string().optional(),
});

// GET /api/subscription-status (Connectfic compatible)
trackingRouter.get("/subscription-status", async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = subscriptionStatusQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || "Invalid query parameters",
      });
      return;
    }

    const result = await getSubscriptionStatus(parseResult.data);
    res.json(result);
  } catch (err: any) {
    console.error("❌ Error in /api/subscription-status:", err);
    res.status(500).json({
      success: false,
      error: err?.message || "Failed to retrieve subscription status",
    });
  }
});

// POST /api/track-usage
trackingRouter.post("/track-usage", async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = trackUsageSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || "Invalid input",
      });
      return;
    }

    const { trial, componentsAdded } = await trackComponentUsage(parseResult.data);
    res.json({
      success: true,
      pluginName: trial.plugin_name,
      componentsAdded,
      currentPlanStatus: trial.current_plan_status,
      trialEndsAt: trial.trial_end,
    });
  } catch (err: any) {
    console.error("❌ Error in /api/track-usage:", err);
    res.status(500).json({
      success: false,
      error: err?.message || "Failed to record usage",
    });
  }
});

// POST /api/start-trial
trackingRouter.post("/start-trial", async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = startTrialSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || "Invalid input",
      });
      return;
    }

    const trial = await getOrCreateTrial(parseResult.data);
    res.json({
      success: true,
      trial,
    });
  } catch (err: any) {
    console.error("❌ Error in /api/start-trial:", err);
    res.status(500).json({
      success: false,
      error: err?.message || "Failed to start trial",
    });
  }
});
