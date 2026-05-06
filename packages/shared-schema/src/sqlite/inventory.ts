import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { outlets, users } from "./auth";
import { products } from "./product";

export const stock = sqliteTable("stock", {
  outlet_id: text("outlet_id").notNull().references(() => outlets.id),
  product_id: text("product_id").notNull().references(() => products.id),
  quantity: real("quantity").notNull().default(0),
  min_stock: real("min_stock").notNull().default(0),
  updated_at: text("updated_at").notNull(),
});

export const stockMovements = sqliteTable("stock_movements", {
  id: text("id").primaryKey(),
  outlet_id: text("outlet_id").notNull().references(() => outlets.id),
  product_id: text("product_id").notNull().references(() => products.id),
  type: text("type", {
    enum: ["in", "out", "adjustment", "transfer_in", "transfer_out", "sale", "void"],
  }).notNull(),
  quantity: real("quantity").notNull(),
  ref_type: text("ref_type"),
  ref_id: text("ref_id"),
  note: text("note"),
  user_id: text("user_id").notNull().references(() => users.id),
  created_at: text("created_at").notNull(),
  synced_at: text("synced_at"),
});
