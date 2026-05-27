import { Router, type IRouter } from "express";
import cors from "cors";
import healthRouter from "./health";
import printRouter from "./print";
import configRouter from "./config";
import logsRouter from "./logs";
import authRouter from "./auth";
import { adminOnly } from "../middleware/adminOnly";

const router: IRouter = Router();

// Promesse-facing endpoint: cross-origin allowed, auth via X-API-Key only.
// Mounted on the exact `/print` path so it does NOT bleed onto /test-print etc.
const promesseOrigin = process.env.PROMESSE_ORIGIN;
router.use(
  "/print",
  cors({
    origin: promesseOrigin ?? true,
    credentials: false,
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-API-Key"],
  }),
);

// Public endpoints: health + auth (auth handles its own gating internally).
router.use(healthRouter);
router.use(authRouter);

// Admin-only gates: mount BEFORE the routers that own these paths so the
// middleware runs first.
router.use("/test-print", adminOnly);
router.use("/printer", adminOnly);
router.use("/config", adminOnly);
router.use("/logs", adminOnly);

// Now mount the actual handlers. /print stays public (X-API-Key check inside).
router.use(printRouter);
router.use(configRouter);
router.use(logsRouter);

export default router;
