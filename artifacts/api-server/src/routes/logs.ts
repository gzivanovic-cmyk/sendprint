import { Router, type IRouter } from "express";
import { GetLogsQueryParams } from "@workspace/api-zod";
import { getStorage, type PrintJobRecord } from "../storage";

const router: IRouter = Router();

function serializeJob(j: PrintJobRecord) {
  return {
    id: j.id,
    createdAt: j.createdAt.toISOString(),
    status: j.status,
    source: j.source,
    zplPreview: j.zplPreview,
    bytesSent: j.bytesSent,
    errorMessage: j.errorMessage,
    printerIp: j.printerIp,
  };
}

router.get("/logs", async (req, res) => {
  const parsed = GetLogsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;
  const storage = await getStorage();
  const rows = await storage.listPrintJobs(limit);
  res.json(rows.map(serializeJob));
});

router.get("/logs/stats", async (_req, res) => {
  const storage = await getStorage();
  const stats = await storage.getLogStats();
  res.json({
    totalJobs: stats.totalJobs,
    successCount: stats.successCount,
    failedCount: stats.failedCount,
    last24hCount: stats.last24hCount,
    lastJobAt: stats.lastJobAt ? stats.lastJobAt.toISOString() : null,
  });
});

router.post("/logs/clear", async (_req, res) => {
  const storage = await getStorage();
  const deleted = await storage.clearPrintJobs();
  res.json({ deleted });
});

export default router;
