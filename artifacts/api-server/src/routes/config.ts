import { Router, type IRouter } from "express";
import { UpdateConfigBody } from "@workspace/api-zod";
import { generateApiKey, getOrCreateConfig, updateConfig } from "../lib/config";

const router: IRouter = Router();

function toResponse(c: { printerIp: string; printerPort: number; serverPort: number; apiKey: string; updatedAt: Date }) {
  return {
    printerIp: c.printerIp,
    printerPort: c.printerPort,
    serverPort: c.serverPort,
    apiKey: c.apiKey,
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/config", async (_req, res) => {
  const config = await getOrCreateConfig();
  res.json(toResponse(config));
});

router.put("/config", async (req, res) => {
  const parsed = UpdateConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid configuration" });
    return;
  }
  const updated = await updateConfig(parsed.data);
  res.json(toResponse(updated));
});

router.post("/config/rotate-key", async (_req, res) => {
  const updated = await updateConfig({ apiKey: generateApiKey() });
  res.json(toResponse(updated));
});

export default router;
