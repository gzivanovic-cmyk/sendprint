import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const configTable = pgTable("config", {
  id: serial("id").primaryKey(),
  printerIp: text("printer_ip").notNull(),
  printerPort: integer("printer_port").notNull(),
  serverPort: integer("server_port").notNull().default(8080),
  apiKey: text("api_key").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ConfigRow = typeof configTable.$inferSelect;
export type InsertConfig = typeof configTable.$inferInsert;
