import { Router, type IRouter } from "express";
import { db, printJobsTable } from "@workspace/db";
import { SubmitPrintJobBody } from "@workspace/api-zod";
import { getOrCreateConfig } from "../lib/config";
import { sendZplToPrinter, checkPrinterReachable } from "../lib/printer";

const router: IRouter = Router();

function previewZpl(zpl: string): string {
  const trimmed = zpl.length > 500 ? zpl.slice(0, 500) + "..." : zpl;
  return trimmed;
}

router.post("/print", async (req, res) => {
  const config = await getOrCreateConfig();
  const providedKey = req.header("x-api-key");
  if (!providedKey || providedKey !== config.apiKey) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  const parsed = SubmitPrintJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body: zpl is required" });
    return;
  }
  const { zpl, source } = parsed.data;

  const result = await sendZplToPrinter(config.printerIp, config.printerPort, zpl);

  const inserted = await db
    .insert(printJobsTable)
    .values({
      status: result.success ? "success" : "failed",
      source: source ?? "Promesse",
      zplPreview: previewZpl(zpl),
      bytesSent: result.bytesSent,
      errorMessage: result.errorMessage,
      printerIp: config.printerIp,
    })
    .returning();

  const job = inserted[0]!;

  if (!result.success) {
    res.status(502).json({ error: result.errorMessage ?? "Printer unreachable" });
    return;
  }

  res.json({
    success: true,
    jobId: job.id,
    message: "Printed",
    bytesSent: result.bytesSent,
  });
});

function buildTestZpl(): string {
  return `^XA
^CF0,40
^FO50,50^FDSendPrint Test^FS
^CF0,25
^FO50,110^FDPrinter is connected and working^FS
^FO50,150^FD${new Date().toISOString()}^FS
^XZ`;
}

router.post("/test-print", async (_req, res) => {
  const config = await getOrCreateConfig();
  const zpl = buildTestZpl();

  const result = await sendZplToPrinter(config.printerIp, config.printerPort, zpl);

  const inserted = await db
    .insert(printJobsTable)
    .values({
      status: result.success ? "success" : "failed",
      source: "Test print",
      zplPreview: previewZpl(zpl),
      bytesSent: result.bytesSent,
      errorMessage: result.errorMessage,
      printerIp: config.printerIp,
    })
    .returning();

  const job = inserted[0]!;

  if (!result.success) {
    res.status(502).json({ error: result.errorMessage ?? "Printer unreachable" });
    return;
  }

  res.json({
    success: true,
    jobId: job.id,
    message: "Test label sent",
    bytesSent: result.bytesSent,
  });
});

router.get("/printer/status", async (_req, res) => {
  const config = await getOrCreateConfig();
  const { online, message } = await checkPrinterReachable(config.printerIp, config.printerPort);
  res.json({
    online,
    printerIp: config.printerIp,
    printerPort: config.printerPort,
    checkedAt: new Date().toISOString(),
    message,
  });
});

export default router;
