import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { tenants } from "./auth";

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  color: text("color"),
  sort_order: integer("sort_order").notNull().default(0),
  deleted_at: text("deleted_at"),
  synced_at: text("synced_at"),
  version: integer("version").notNull().default(1),
});

export const products = sqliteTable("products", {
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
  is_active: integer("is_active", { mode: "boolean" }).notNull().default(true),
  track_stock: integer("track_stock", { mode: "boolean" }).notNull().default(true),
  unit: text("unit").notNull().default("pcs"),
  deleted_at: text("deleted_at"),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
  synced_at: text("synced_at"),
  version: integer("version").notNull().default(1),
});

export const productVariants = sqliteTable("product_variants", {
  id: text("id").primaryKey(),
  product_id: text("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  price_modifier: real("price_modifier").notNull().default(0),
  sku: text("sku"),
});

export const modifiers = sqliteTable("modifiers", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  type: text("type", { enum: ["single", "multiple"] }).notNull().default("single"),
});

export const modifierOptions = sqliteTable("modifier_options", {
  id: text("id").primaryKey(),
  modifier_id: text("modifier_id").notNull().references(() => modifiers.id),
  name: text("name").notNull(),
  price_delta: real("price_delta").notNull().default(0),
});

export const productModifiers = sqliteTable("product_modifiers", {
  product_id: text("product_id").notNull().references(() => products.id),
  modifier_id: text("modifier_id").notNull().references(() => modifiers.id),
});
