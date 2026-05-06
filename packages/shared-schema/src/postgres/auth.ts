import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  business_type: text("business_type").notNull().default("retail"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outlets = pgTable("outlets", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  receipt_header: text("receipt_header"),
  receipt_footer: text("receipt_footer"),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull().references(() => tenants.id),
  email: text("email"),
  full_name: text("full_name").notNull(),
  pin_hash: text("pin_hash"),
  role: text("role").notNull().$type<"owner" | "admin" | "supervisor" | "cashier">(),
  is_active: boolean("is_active").notNull().default(true),
  last_login_at: timestamp("last_login_at", { withTimezone: true }),
});

export const userOutlets = pgTable("user_outlets", {
  user_id: text("user_id").notNull().references(() => users.id),
  outlet_id: text("outlet_id").notNull().references(() => outlets.id),
});
