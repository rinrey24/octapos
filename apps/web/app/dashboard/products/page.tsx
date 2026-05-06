import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantId, getProducts } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tenantId = await resolveTenantId(user.email ?? "");
  const products = tenantId ? await getProducts(tenantId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Master Data Produk</h1>
        <p className="text-sm text-muted-foreground">
          {products.length} produk aktif. Untuk menambah / edit produk, gunakan aplikasi desktop.
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground bg-muted/40">
              <th className="px-4 py-3 text-left font-medium">Nama Produk</th>
              <th className="px-4 py-3 text-left font-medium">SKU</th>
              <th className="px-4 py-3 text-left font-medium">Kategori</th>
              <th className="px-4 py-3 text-left font-medium">Satuan</th>
              <th className="px-4 py-3 text-right font-medium">Harga</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada produk. Tambahkan produk melalui aplikasi desktop.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {p.sku ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {p.category_name ?? <span className="italic">Tanpa kategori</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.unit}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">
                    {p.priceFormatted}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant={p.is_active ? "success" : "secondary"}>
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
