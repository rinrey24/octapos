import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const syncQueue = sqliteTable("sync_queue", {
  id: text("id").primaryKey(),
  table_name: text("table_name").notNull(),
  row_id: text("row_id").notNull(),
  action: text("action", { enum: ["insert", "update", "delete"] }).notNull(),
  payload: text("payload").notNull(), // JSON string
  status: text("status", { enum: ["pending", "synced", "failed", "conflict"] })
    .notNull()
    .default("pending"),
  error: text("error"),
  retry_count: integer("retry_count").notNull().default(0),
  created_at: text("created_at").notNull(),
  synced_at: text("synced_at"),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull(),
  user_id: text("user_id").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entity_id: text("entity_id").notNull(),
  before: text("before"), // JSON string
  after: text("after"), // JSON string
  created_at: text("created_at").notNull(),
});
