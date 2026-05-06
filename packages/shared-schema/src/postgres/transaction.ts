import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { outlets, users } from "./auth";
import { products, productVariants, modifierOptions } from "./product";

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  tenant_id: text("tenant_id").notNull(),
  outlet_id: text("outlet_id").notNull().references(() => outlets.id),
  invoice_no: text("invoice_no").notNull().unique(),
  cashier_id: text("cashier_id").notNull().references(() => users.id),
  customer_id: text("customer_id"),
  subtotal: real("subtotal").notNull(),
  discount_total: real("discount_total").notNull().default(0),
  tax_total: real("tax_total").notNull().default(0),
  service_charge: real("service_charge").notNull().default(0),
  rounding: real("rounding").notNull().default(0),
  total: real("total").notNull(),
  paid_amount: real("paid_amount").notNull(),
  change_amount: real("change_amount").notNull().default(0),
  status: text("status").notNull().default("draft").$type<"draft" | "paid" | "void" | "refunded">(),
  payment_method: text("payment_method")
    .notNull()
    .$type<"cash" | "qris" | "edc_debit" | "edc_credit" | "transfer" | "split">(),
  notes: text("notes"),
  voided_at: timestamp("voided_at", { withTimezone: true }),
  voided_by: text("voided_by"),
  void_reason: text("void_reason"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  synced_at: timestamp("synced_at", { withTimezone: true }),
  device_id: text("device_id").notNull(),
});

export const transactionItems = pgTable("transaction_items", {
  id: text("id").primaryKey(),
  transaction_id: text("transaction_id").notNull().references(() => transactions.id),
  product_id: text("product_id").notNull().references(() => products.id),
  variant_id: text("variant_id").references(() => productVariants.id),
  product_name_snapshot: text("product_name_snapshot").notNull(),
  sku_snapshot: text("sku_snapshot"),
  price_snapshot: real("price_snapshot").notNull(),
  quantity: real("quantity").notNull(),
  discount: real("discount").notNull().default(0),
  subtotal: real("subtotal").notNull(),
  notes: text("notes"),
});

export const transactionItemModifiers = pgTable("transaction_item_modifiers", {
  item_id: text("item_id").notNull().references(() => transactionItems.id),
  modifier_option_id: text("modifier_option_id")
    .notNull()
    .references(() => modifierOptions.id),
  name_snapshot: text("name_snapshot").notNull(),
  price_snapshot: real("price_snapshot").notNull(),
});

export const transactionPayments = pgTable("transaction_payments", {
  id: text("id").primaryKey(),
  transaction_id: text("transaction_id").notNull().references(() => transactions.id),
  method: text("method")
    .notNull()
    .$type<"cash" | "qris" | "edc_debit" | "edc_credit" | "transfer" | "split">(),
  amount: real("amount").notNull(),
  reference_no: text("reference_no"),
  paid_at: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashSessions = pgTable("cash_sessions", {
  id: text("id").primaryKey(),
  outlet_id: text("outlet_id").notNull().references(() => outlets.id),
  cashier_id: text("cashier_id").notNull().references(() => users.id),
  opening_cash: real("opening_cash").notNull(),
  closing_cash: real("closing_cash"),
  expected_cash: real("expected_cash"),
  variance: real("variance"),
  opened_at: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closed_at: timestamp("closed_at", { withTimezone: true }),
  notes: text("notes"),
  synced_at: timestamp("synced_at", { withTimezone: true }),
});
