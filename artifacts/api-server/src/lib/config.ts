import crypto from "node:crypto";
import { getStorage, type ConfigRecord, type ConfigPatch } from "../storage";

export function generateApiKey(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function getOrCreateConfig(): Promise<ConfigRecord> {
  const storage = await getStorage();
  return storage.getOrCreateConfig({
    printerIp: "192.168.1.100",
    printerPort: 9100,
    serverPort: Number(process.env.PORT) || 8080,
    apiKey: generateApiKey(),
  });
}

export async function updateConfig(patch: ConfigPatch): Promise<ConfigRecord> {
  await getOrCreateConfig();
  const storage = await getStorage();
  return storage.updateConfig(patch);
}
