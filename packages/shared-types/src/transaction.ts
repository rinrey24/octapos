export type TransactionStatus = "draft" | "paid" | "void" | "refunded";

export type PaymentMethod =
  | "cash"
  | "qris"
  | "edc_debit"
  | "edc_credit"
  | "transfer"
  | "split";

export interface Transaction {
  id: string;
  tenant_id: string;
  outlet_id: string;
  invoice_no: string;
  cashier_id: string;
  customer_id: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  service_charge: number;
  rounding: number;
  total: number;
  paid_amount: number;
  change_amount: number;
  status: TransactionStatus;
  payment_method: PaymentMethod;
  notes: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  device_id: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  variant_id: string | null;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  price_snapshot: number;
  quantity: number;
  discount: number;
  subtotal: number;
  notes: string | null;
}

export interface TransactionItemModifier {
  item_id: string;
  modifier_option_id: string;
  name_snapshot: string;
  price_snapshot: number;
}

export interface TransactionPayment {
  id: string;
  transaction_id: string;
  method: PaymentMethod;
  amount: number;
  reference_no: string | null;
  paid_at: string;
}

/** Cart state sebelum transaksi disimpan */
export interface CartItem {
  product_id: string;
  variant_id: string | null;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  price_snapshot: number;
  quantity: number;
  discount: number;
  notes: string | null;
  modifiers: { modifier_option_id: string; name_snapshot: string; price_snapshot: number }[];
}
