import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { outlets, users } from "./auth";
import { products } from "./product";

export const stock = pgTable("stock", {
  outlet_id: text("outlet_id").notNull().references(() => outlets.id),
  product_id: text("product_id").notNull().references(() => products.id),
  quantity: real("quantity").notNull().default(0),
  min_stock: real("min_stock").notNull().default(0),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockMovements = pgTable("stock_movements", {
  id: text("id").primaryKey(),
  outlet_id: text("outlet_id").notNull().references(() => outlets.id),
  product_id: text("product_id").notNull().references(() => products.id),
  type: text("type")
    .notNull()
    .$type<"in" | "out" | "adjustment" | "transfer_in" | "transfer_out" | "sale" | "void">(),
  quantity: real("quantity").notNull(),
  ref_type: text("ref_type"),
  ref_id: text("ref_id"),
  note: text("note"),
  user_id: text("user_id").notNull().references(() => users.id),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  synced_at: timestamp("synced_at", { withTimezone: true }),
});
