import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const printJobsTable = pgTable("print_jobs", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull(),
  source: text("source"),
  zplPreview: text("zpl_preview"),
  bytesSent: integer("bytes_sent").notNull().default(0),
  errorMessage: text("error_message"),
  printerIp: text("printer_ip"),
});

export type PrintJobRow = typeof printJobsTable.$inferSelect;
export type InsertPrintJob = typeof printJobsTable.$inferInsert;
