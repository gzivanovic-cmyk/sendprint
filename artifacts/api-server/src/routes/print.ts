import { Router, type IRouter } from "express";
import { SubmitPrintJobBody } from "@workspace/api-zod";
import { getOrCreateConfig } from "../lib/config";
import { sendZplToPrinter, checkPrinterReachable } from "../lib/printer";
import { getStorage } from "../storage";

const router: IRouter = Router();

function previewZpl(zpl: string): string {
  return zpl.length > 500 ? zpl.slice(0, 500) + "..." : zpl;
}

router.post("/print", async (req, res) => {
  const config = await getOrCreateConfig();
  const providedKey = req.header("x-api-key");
  if (!providedKey || providedKey !== config.apiKey) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  // Accept three body shapes for compatibility:
  //   1. JSON  : { "zpl": "...", "source": "..." }   (canonical)
  //   2. text  : raw ZPL as text/plain               (legacy SendPrint.exe)
  //   3. binary: raw ZPL as application/octet-stream (some Promesse builds)
  let zpl: string | undefined;
  let source: string | undefined;
  if (typeof req.body === "string") {
    zpl = req.body;
  } else if (Buffer.isBuffer(req.body)) {
    zpl = req.body.toString("utf8");
  } else {
    const parsed = SubmitPrintJobBody.safeParse(req.body);
    if (parsed.success) {
      zpl = parsed.data.zpl;
      source = parsed.data.source;
    }
  }
  if (!zpl || zpl.trim().length === 0) {
    res.status(400).json({ error: "Invalid body: zpl is required" });
    return;
  }

  const result = await sendZplToPrinter(config.printerIp, config.printerPort, zpl);

  const storage = await getStorage();
  const job = await storage.insertPrintJob({
    status: result.success ? "success" : "failed",
    source: source ?? "Promesse",
    zplPreview: previewZpl(zpl),
    bytesSent: result.bytesSent,
    errorMessage: result.errorMessage,
    printerIp: config.printerIp,
  });

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

  const storage = await getStorage();
  const job = await storage.insertPrintJob({
    status: result.success ? "success" : "failed",
    source: "Test print",
    zplPreview: previewZpl(zpl),
    bytesSent: result.bytesSent,
    errorMessage: result.errorMessage,
    printerIp: config.printerIp,
  });

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
