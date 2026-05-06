import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@octapos/shared-utils";
import type { ProductWithCategory } from "@octapos/shared-types";

interface ProductCardProps {
  product: ProductWithCategory;
  onTap: (product: ProductWithCategory) => void;
}

export function ProductCard({ product, onTap }: ProductCardProps) {
  const categoryColor = product.category?.color ?? "#6B7280";

  return (
    <button
      type="button"
      className={cn(
        "flex flex-col rounded-xl border bg-card p-3 text-left shadow-sm transition-all",
        "active:scale-95 active:shadow-none hover:shadow-md hover:border-primary/40",
        "min-h-[120px]"
      )}
      onClick={() => onTap(product)}
    >
      {/* Category strip */}
      <div className="mb-2 h-1 w-full rounded-full" style={{ backgroundColor: categoryColor }} />

      {/* Image or icon */}
      <div className="mb-2 flex h-12 items-center justify-center">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded object-cover" />
        ) : (
          <Package className="h-8 w-8 text-muted-foreground/40" />
        )}
      </div>

      {/* Name */}
      <p className="line-clamp-2 flex-1 text-sm font-medium leading-tight">{product.name}</p>

      {/* Price */}
      <p className="mt-1 font-mono text-base font-bold text-primary">
        {formatCurrency(product.price)}
      </p>
    </button>
  );
}
