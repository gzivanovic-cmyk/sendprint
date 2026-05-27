import { db, configTable, printJobsTable, adminTable } from "@workspace/db";
import { AdminAlreadyExistsError } from "./types";
import { eq, desc, sql } from "drizzle-orm";
import type {
  AdminRecord,
  ConfigDefaults,
  ConfigPatch,
  ConfigRecord,
  LogStatsRecord,
  NewPrintJobInput,
  PrintJobRecord,
  Storage,
} from "./types";

const SINGLETON_ID = 1;

function toConfig(row: typeof configTable.$inferSelect): ConfigRecord {
  return {
    id: row.id,
    printerIp: row.printerIp,
    printerPort: row.printerPort,
    serverPort: row.serverPort,
    apiKey: row.apiKey,
    updatedAt: row.updatedAt,
  };
}

function toJob(row: typeof printJobsTable.$inferSelect): PrintJobRecord {
  return {
    id: row.id,
    createdAt: row.createdAt,
    status: row.status,
    source: row.source,
    zplPreview: row.zplPreview,
    bytesSent: row.bytesSent,
    errorMessage: row.errorMessage,
    printerIp: row.printerIp,
  };
}

function toAdmin(row: typeof adminTable.$inferSelect): AdminRecord {
  return {
    id: row.id,
    passwordHash: row.passwordHash,
    sessionSecret: row.sessionSecret,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PostgresStorage implements Storage {
  async getOrCreateConfig(defaults: ConfigDefaults): Promise<ConfigRecord> {
    const existing = await db
      .select()
      .from(configTable)
      .where(eq(configTable.id, SINGLETON_ID))
      .limit(1);
    if (existing[0]) return toConfig(existing[0]);

    const inserted = await db
      .insert(configTable)
      .values({ id: SINGLETON_ID, ...defaults })
      .onConflictDoNothing({ target: configTable.id })
      .returning();
    if (inserted[0]) return toConfig(inserted[0]);

    const after = await db
      .select()
      .from(configTable)
      .where(eq(configTable.id, SINGLETON_ID))
      .limit(1);
    return toConfig(after[0]!);
  }

  async updateConfig(patch: ConfigPatch): Promise<ConfigRecord> {
    const updated = await db
      .update(configTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(configTable.id, SINGLETON_ID))
      .returning();
    return toConfig(updated[0]!);
  }

  async insertPrintJob(input: NewPrintJobInput): Promise<PrintJobRecord> {
    const inserted = await db.insert(printJobsTable).values(input).returning();
    return toJob(inserted[0]!);
  }

  async listPrintJobs(limit: number): Promise<PrintJobRecord[]> {
    const rows = await db
      .select()
      .from(printJobsTable)
      .orderBy(desc(printJobsTable.createdAt), desc(printJobsTable.id))
      .limit(limit);
    return rows.map(toJob);
  }

  async getLogStats(): Promise<LogStatsRecord> {
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
    return {
      totalJobs: r.totalJobs ?? 0,
      successCount: r.successCount ?? 0,
      failedCount: r.failedCount ?? 0,
      last24hCount: r.last24hCount ?? 0,
      lastJobAt: r.lastJobAt ? new Date(r.lastJobAt) : null,
    };
  }

  async clearPrintJobs(): Promise<number> {
    const deleted = await db
      .delete(printJobsTable)
      .returning({ id: printJobsTable.id });
    return deleted.length;
  }

  async getAdmin(): Promise<AdminRecord | null> {
    const rows = await db
      .select()
      .from(adminTable)
      .where(eq(adminTable.id, SINGLETON_ID))
      .limit(1);
    return rows[0] ? toAdmin(rows[0]) : null;
  }

  async createAdmin(
    passwordHash: string,
    sessionSecret: string,
  ): Promise<AdminRecord> {
    const inserted = await db
      .insert(adminTable)
      .values({ id: SINGLETON_ID, passwordHash, sessionSecret })
      .onConflictDoNothing({ target: adminTable.id })
      .returning();
    if (inserted.length === 0) {
      throw new AdminAlreadyExistsError();
    }
    return toAdmin(inserted[0]!);
  }

  async updateAdminPassword(passwordHash: string): Promise<AdminRecord> {
    const updated = await db
      .update(adminTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(adminTable.id, SINGLETON_ID))
      .returning();
    return toAdmin(updated[0]!);
  }

  async rotateAdminSessionSecret(sessionSecret: string): Promise<AdminRecord> {
    const updated = await db
      .update(adminTable)
      .set({ sessionSecret, updatedAt: new Date() })
      .where(eq(adminTable.id, SINGLETON_ID))
      .returning();
    return toAdmin(updated[0]!);
  }
}
