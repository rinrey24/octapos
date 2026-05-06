export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  deleted_at: string | null;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  category_id: string | null;
  price: number;
  cost: number | null;
  tax_rate: number;
  image_url: string | null;
  is_active: boolean;
  track_stock: boolean;
  unit: string;
  deleted_at: string | null;
  version: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price_modifier: number;
  sku: string | null;
}

export interface Modifier {
  id: string;
  tenant_id: string;
  name: string;
  type: "single" | "multiple";
}

export interface ModifierOption {
  id: string;
  modifier_id: string;
  name: string;
  price_delta: number;
}

export interface ProductWithCategory extends Product {
  category: Category | null;
  variants: ProductVariant[];
  modifiers: Modifier[];
}
