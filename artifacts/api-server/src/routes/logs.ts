import { Router, type IRouter } from "express";
import { db, printJobsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import { GetLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeJob(j: typeof printJobsTable.$inferSelect) {
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
  const rows = await db
    .select()
    .from(printJobsTable)
    .orderBy(desc(printJobsTable.createdAt))
    .limit(limit);
  res.json(rows.map(serializeJob));
});

router.get("/logs/stats", async (_req, res) => {
  const result = await db
    .select({
      totalJobs: sql<number>`count(*)::int`,
      successCount: sql<number>`count(*) filter (where status = 'success')::int`,
      failedCount: sql<number>`count(*) filter (where status = 'failed')::int`,
      last24hCount: sql<number>`count(*) filter (where created_at > now() - interval '24 hours')::int`,
      lastJobAt: sql<Date | null>`max(created_at)`,
    })
    .from(printJobsTable);

  const r = result[0]!;
  res.json({
    totalJobs: r.totalJobs ?? 0,
    successCount: r.successCount ?? 0,
    failedCount: r.failedCount ?? 0,
    last24hCount: r.last24hCount ?? 0,
    lastJobAt: r.lastJobAt ? new Date(r.lastJobAt).toISOString() : null,
  });
});

router.post("/logs/clear", async (_req, res) => {
  const deleted = await db.delete(printJobsTable).returning({ id: printJobsTable.id });
  res.json({ deleted: deleted.length });
});

export default router;
