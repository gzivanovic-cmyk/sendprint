import path from "node:path";
import type { Storage } from "./types";

export type { Storage } from "./types";
export type {
  ConfigRecord,
  ConfigPatch,
  ConfigDefaults,
  PrintJobRecord,
  NewPrintJobInput,
  LogStatsRecord,
} from "./types";

let instance: Storage | null = null;
let initPromise: Promise<Storage> | null = null;

async function createStorage(): Promise<Storage> {
  const mode = (process.env.STORAGE ?? "sqlite").toLowerCase();
  if (mode === "postgres" || mode === "pg") {
    const { PostgresStorage } = await import("./postgres");
    return new PostgresStorage();
  }
  if (mode === "sqlite") {
    const { SqliteStorage } = await import("./sqlite");
    const dataDir = process.env.DATA_DIR ?? "./data";
    const filePath = path.resolve(dataDir, "sendprint.db");
    return new SqliteStorage(filePath);
  }
  throw new Error(
    `Unknown STORAGE value: "${mode}". Use "sqlite" (default) or "postgres".`,
  );
}

export async function getStorage(): Promise<Storage> {
  if (instance) return instance;
  if (!initPromise) {
    initPromise = createStorage().then((s) => {
      instance = s;
      return s;
    });
  }
  return initPromise;
}
