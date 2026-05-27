import path from "node:path";
import fs from "node:fs";
import Database from "libsql";
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
import { AdminAlreadyExistsError } from "./types";

const SINGLETON_ID = 1;

interface ConfigRow {
  id: number;
  printer_ip: string;
  printer_port: number;
  server_port: number;
  api_key: string;
  updated_at: number;
}

interface JobRow {
  id: number;
  created_at: number;
  status: string;
  source: string | null;
  zpl_preview: string | null;
  bytes_sent: number;
  error_message: string | null;
  printer_ip: string | null;
}

interface AdminRow {
  id: number;
  password_hash: string;
  session_secret: string;
  created_at: number;
  updated_at: number;
}

function rowToConfig(row: ConfigRow): ConfigRecord {
  return {
    id: row.id,
    printerIp: row.printer_ip,
    printerPort: row.printer_port,
    serverPort: row.server_port,
    apiKey: row.api_key,
    updatedAt: new Date(row.updated_at),
  };
}

function rowToJob(row: JobRow): PrintJobRecord {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    status: row.status,
    source: row.source,
    zplPreview: row.zpl_preview,
    bytesSent: row.bytes_sent,
    errorMessage: row.error_message,
    printerIp: row.printer_ip,
  };
}

function rowToAdmin(row: AdminRow): AdminRecord {
  return {
    id: row.id,
    passwordHash: row.password_hash,
    sessionSecret: row.session_secret,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SqliteStorage implements Storage {
  private db: Database.Database;

  constructor(filePath: string) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(filePath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY,
        printer_ip TEXT NOT NULL,
        printer_port INTEGER NOT NULL,
        server_port INTEGER NOT NULL DEFAULT 8080,
        api_key TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS print_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        source TEXT,
        zpl_preview TEXT,
        bytes_sent INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        printer_ip TEXT
      );
      CREATE INDEX IF NOT EXISTS print_jobs_created_at_idx ON print_jobs (created_at DESC);
      CREATE INDEX IF NOT EXISTS print_jobs_status_idx ON print_jobs (status);
      CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY,
        password_hash TEXT NOT NULL,
        session_secret TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  async getOrCreateConfig(defaults: ConfigDefaults): Promise<ConfigRecord> {
    const existing = this.db
      .prepare("SELECT * FROM config WHERE id = ?")
      .get(SINGLETON_ID) as ConfigRow | undefined;
    if (existing) return rowToConfig(existing);

    this.db
      .prepare(
        `INSERT OR IGNORE INTO config (id, printer_ip, printer_port, server_port, api_key, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        SINGLETON_ID,
        defaults.printerIp,
        defaults.printerPort,
        defaults.serverPort,
        defaults.apiKey,
        Date.now(),
      );
    const after = this.db
      .prepare("SELECT * FROM config WHERE id = ?")
      .get(SINGLETON_ID) as ConfigRow;
    return rowToConfig(after);
  }

  async updateConfig(patch: ConfigPatch): Promise<ConfigRecord> {
    const sets: string[] = [];
    const values: (string | number)[] = [];
    if (patch.printerIp !== undefined) {
      sets.push("printer_ip = ?");
      values.push(patch.printerIp);
    }
    if (patch.printerPort !== undefined) {
      sets.push("printer_port = ?");
      values.push(patch.printerPort);
    }
    if (patch.serverPort !== undefined) {
      sets.push("server_port = ?");
      values.push(patch.serverPort);
    }
    if (patch.apiKey !== undefined) {
      sets.push("api_key = ?");
      values.push(patch.apiKey);
    }
    sets.push("updated_at = ?");
    values.push(Date.now());
    values.push(SINGLETON_ID);

    this.db
      .prepare(`UPDATE config SET ${sets.join(", ")} WHERE id = ?`)
      .run(...values);
    const after = this.db
      .prepare("SELECT * FROM config WHERE id = ?")
      .get(SINGLETON_ID) as ConfigRow;
    return rowToConfig(after);
  }

  async insertPrintJob(input: NewPrintJobInput): Promise<PrintJobRecord> {
    const result = this.db
      .prepare(
        `INSERT INTO print_jobs (created_at, status, source, zpl_preview, bytes_sent, error_message, printer_ip)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        Date.now(),
        input.status,
        input.source,
        input.zplPreview,
        input.bytesSent,
        input.errorMessage,
        input.printerIp,
      );
    const id = Number(result.lastInsertRowid);
    const row = this.db
      .prepare("SELECT * FROM print_jobs WHERE id = ?")
      .get(id) as JobRow;
    return rowToJob(row);
  }

  async listPrintJobs(limit: number): Promise<PrintJobRecord[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM print_jobs ORDER BY created_at DESC, id DESC LIMIT ?",
      )
      .all(limit) as JobRow[];
    return rows.map(rowToJob);
  }

  async getLogStats(): Promise<LogStatsRecord> {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const row = this.db
      .prepare(
        `SELECT
           COUNT(*) AS totalJobs,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successCount,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedCount,
           SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END) AS last24hCount,
           MAX(created_at) AS lastJobAt
         FROM print_jobs`,
      )
      .get(cutoff) as {
        totalJobs: number | bigint | null;
        successCount: number | bigint | null;
        failedCount: number | bigint | null;
        last24hCount: number | bigint | null;
        lastJobAt: number | null;
      };
    return {
      totalJobs: Number(row.totalJobs ?? 0),
      successCount: Number(row.successCount ?? 0),
      failedCount: Number(row.failedCount ?? 0),
      last24hCount: Number(row.last24hCount ?? 0),
      lastJobAt: row.lastJobAt ? new Date(row.lastJobAt) : null,
    };
  }

  async clearPrintJobs(): Promise<number> {
    const result = this.db.prepare("DELETE FROM print_jobs").run();
    return Number(result.changes);
  }

  async getAdmin(): Promise<AdminRecord | null> {
    const row = this.db
      .prepare("SELECT * FROM admin WHERE id = ?")
      .get(SINGLETON_ID) as AdminRow | undefined;
    return row ? rowToAdmin(row) : null;
  }

  async createAdmin(
    passwordHash: string,
    sessionSecret: string,
  ): Promise<AdminRecord> {
    const now = Date.now();
    const info = this.db
      .prepare(
        `INSERT INTO admin (id, password_hash, session_secret, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .run(SINGLETON_ID, passwordHash, sessionSecret, now, now);
    if (info.changes === 0) {
      throw new AdminAlreadyExistsError();
    }
    const row = this.db
      .prepare("SELECT * FROM admin WHERE id = ?")
      .get(SINGLETON_ID) as AdminRow;
    return rowToAdmin(row);
  }

  async updateAdminPassword(passwordHash: string): Promise<AdminRecord> {
    this.db
      .prepare(
        "UPDATE admin SET password_hash = ?, updated_at = ? WHERE id = ?",
      )
      .run(passwordHash, Date.now(), SINGLETON_ID);
    const row = this.db
      .prepare("SELECT * FROM admin WHERE id = ?")
      .get(SINGLETON_ID) as AdminRow;
    return rowToAdmin(row);
  }

  async rotateAdminSessionSecret(sessionSecret: string): Promise<AdminRecord> {
    this.db
      .prepare(
        "UPDATE admin SET session_secret = ?, updated_at = ? WHERE id = ?",
      )
      .run(sessionSecret, Date.now(), SINGLETON_ID);
    const row = this.db
      .prepare("SELECT * FROM admin WHERE id = ?")
      .get(SINGLETON_ID) as AdminRow;
    return rowToAdmin(row);
  }
}
