import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard } from "./ProductCard";
import type { ProductWithCategory, Category } from "@octapos/shared-types";

interface ProductGridProps {
  products: ProductWithCategory[];
  categories: Category[];
  onProductTap: (product: ProductWithCategory) => void;
}

export function ProductGrid({ products, categories, onProductTap }: ProductGridProps) {
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = !activeCategoryId || p.category_id === activeCategoryId;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? "").includes(search) ||
        (p.sku ?? "").toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, activeCategoryId, search]);

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 h-12"
          placeholder="Cari produk atau scan barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button
          variant={activeCategoryId === null ? "default" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={() => setActiveCategoryId(null)}
        >
          Semua
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategoryId === cat.id ? "default" : "outline"}
            size="sm"
            className="shrink-0"
            onClick={() => setActiveCategoryId(cat.id)}
            style={activeCategoryId === cat.id && cat.color ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Tidak ada produk ditemukan
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 pb-2 xl:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onTap={onProductTap} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
