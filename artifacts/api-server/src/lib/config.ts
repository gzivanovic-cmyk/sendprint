import crypto from "node:crypto";
import { db, configTable, type ConfigRow } from "@workspace/db";
import { eq } from "drizzle-orm";

const SINGLETON_ID = 1;

export function generateApiKey(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function getOrCreateConfig(): Promise<ConfigRow> {
  const existing = await db.select().from(configTable).where(eq(configTable.id, SINGLETON_ID)).limit(1);
  if (existing.length > 0) {
    return existing[0]!;
  }
  const inserted = await db
    .insert(configTable)
    .values({
      id: SINGLETON_ID,
      printerIp: "192.168.1.100",
      printerPort: 9100,
      serverPort: Number(process.env.PORT) || 8080,
      apiKey: generateApiKey(),
    })
    .onConflictDoNothing({ target: configTable.id })
    .returning();
  if (inserted[0]) return inserted[0];
  const after = await db.select().from(configTable).where(eq(configTable.id, SINGLETON_ID)).limit(1);
  return after[0]!;
}

export async function updateConfig(patch: {
  printerIp?: string;
  printerPort?: number;
  serverPort?: number;
  apiKey?: string;
}): Promise<ConfigRow> {
  await getOrCreateConfig();
  const updated = await db
    .update(configTable)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(configTable.id, SINGLETON_ID))
    .returning();
  return updated[0]!;
}
