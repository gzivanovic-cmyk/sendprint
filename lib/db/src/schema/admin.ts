import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const adminTable = pgTable("admin", {
  id: serial("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  sessionSecret: text("session_secret").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminRow = typeof adminTable.$inferSelect;
export type InsertAdmin = typeof adminTable.$inferInsert;
