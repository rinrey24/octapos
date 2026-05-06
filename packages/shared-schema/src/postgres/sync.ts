import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull(),
  user_id: text("user_id").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entity_id: text("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
