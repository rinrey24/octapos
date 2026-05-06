export type StockMovementType =
  | "in"
  | "out"
  | "adjustment"
  | "transfer_in"
  | "transfer_out"
  | "sale"
  | "void";

export interface Stock {
  outlet_id: string;
  product_id: string;
  quantity: number;
  min_stock: number;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  outlet_id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  ref_type: string | null;
  ref_id: string | null;
  note: string | null;
  user_id: string;
  created_at: string;
}
