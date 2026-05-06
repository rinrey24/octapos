import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(), // UUID v7
  name: text("name").notNull(),
  business_type: text("business_type").notNull().default("retail"),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const outlets = sqliteTable("outlets", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  receipt_header: text("receipt_header"),
  receipt_footer: text("receipt_footer"),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull().references(() => tenants.id),
  email: text("email"),
  full_name: text("full_name").notNull(),
  pin_hash: text("pin_hash"),
  role: text("role", { enum: ["owner", "admin", "supervisor", "cashier"] }).notNull(),
  is_active: integer("is_active", { mode: "boolean" }).notNull().default(true),
  last_login_at: text("last_login_at"),
});

export const userOutlets = sqliteTable("user_outlets", {
  user_id: text("user_id").notNull().references(() => users.id),
  outlet_id: text("outlet_id").notNull().references(() => outlets.id),
});
