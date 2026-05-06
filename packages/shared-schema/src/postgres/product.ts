import { pgTable, text, boolean, timestamp, real, integer } from "drizzle-orm/pg-core";
import { tenants } from "./auth";

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  color: text("color"),
  sort_order: integer("sort_order").notNull().default(0),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  synced_at: timestamp("synced_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull().references(() => tenants.id),
  sku: text("sku"),
  barcode: text("barcode"),
  name: text("name").notNull(),
  category_id: text("category_id").references(() => categories.id),
  price: real("price").notNull(),
  cost: real("cost"),
  tax_rate: real("tax_rate").notNull().default(0),
  image_url: text("image_url"),
  is_active: boolean("is_active").notNull().default(true),
  track_stock: boolean("track_stock").notNull().default(true),
  unit: text("unit").notNull().default("pcs"),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  synced_at: timestamp("synced_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
});

export const productVariants = pgTable("product_variants", {
  id: text("id").primaryKey(),
  product_id: text("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  price_modifier: real("price_modifier").notNull().default(0),
  sku: text("sku"),
});

export const modifiers = pgTable("modifiers", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  type: text("type").notNull().default("single").$type<"single" | "multiple">(),
});

export const modifierOptions = pgTable("modifier_options", {
  id: text("id").primaryKey(),
  modifier_id: text("modifier_id").notNull().references(() => modifiers.id),
  name: text("name").notNull(),
  price_delta: real("price_delta").notNull().default(0),
});

export const productModifiers = pgTable("product_modifiers", {
  product_id: text("product_id").notNull().references(() => products.id),
  modifier_id: text("modifier_id").notNull().references(() => modifiers.id),
});
