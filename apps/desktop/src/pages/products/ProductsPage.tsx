import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/auth.store";
import { getProducts, createProduct, updateProduct, deleteProduct, type CreateProductData } from "@/lib/repositories/product.repo";
import { getCategories, createCategory, deleteCategory } from "@/lib/repositories/category.repo";
import { formatCurrency } from "@octapos/shared-utils";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import type { ProductWithCategory } from "@octapos/shared-types";

const CATEGORY_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"];

export default function ProductsPage() {
  const { session } = useAuthStore();
  const qc = useQueryClient();
  const tenantId = session?.tenant.id ?? "";

  const [productDialog, setProductDialog] = useState<{ open: boolean; product?: ProductWithCategory }>({ open: false });
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string; type?: "product" | "category" }>({ open: false });

  const { data: products = [] } = useQuery({ queryKey: ["products", tenantId], queryFn: () => getProducts(tenantId), enabled: !!tenantId });
  const { data: categories = [] } = useQuery({ queryKey: ["categories", tenantId], queryFn: () => getCategories(tenantId), enabled: !!tenantId });

  // ── Product form state ────────────────────────────────────────────────────
  const [pForm, setPForm] = useState<CreateProductData & { id?: string }>({
    name: "", price: 0, category_id: null, sku: null, barcode: null,
    unit: "pcs", track_stock: false, tax_rate: 0,
  });

  function openCreate() {
    setPForm({ name: "", price: 0, category_id: null, sku: null, barcode: null, unit: "pcs", track_stock: false, tax_rate: 0 });
    setProductDialog({ open: true });
  }

  function openEdit(p: ProductWithCategory) {
    setPForm({ id: p.id, name: p.name, price: p.price, category_id: p.category_id, sku: p.sku, barcode: p.barcode, unit: p.unit, track_stock: p.track_stock, tax_rate: p.tax_rate });
    setProductDialog({ open: true, product: p });
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (pForm.id) {
        await updateProduct(pForm.id, pForm);
      } else {
        await createProduct(tenantId, pForm);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setProductDialog({ open: false });
      toast({ title: pForm.id ? "Produk diperbarui" : "Produk ditambahkan" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Gagal", description: String(e) }),
  });

  const deleteMut = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "product" | "category" }) => {
      if (type === "product") await deleteProduct(id);
      else await deleteCategory(id);
    },
    onSuccess: (_, { type }) => {
      qc.invalidateQueries({ queryKey: type === "product" ? ["products"] : ["categories"] });
      setDeleteConfirm({ open: false });
      toast({ title: type === "product" ? "Produk dihapus" : "Kategori dihapus" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Gagal", description: String(e) }),
  });

  // ── Category form state ───────────────────────────────────────────────────
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState(CATEGORY_COLORS[0]!);

  const saveCatMut = useMutation({
    mutationFn: () => createCategory(tenantId, { name: catName, color: catColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setCategoryDialog(false);
      setCatName("");
      toast({ title: "Kategori ditambahkan" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Gagal", description: String(e) }),
  });

  return (
    <AppShell>
      <div className="flex h-full flex-col p-4 gap-4">
        <Tabs defaultValue="products" className="flex-1 flex flex-col">
          <div className="flex items-center gap-4">
            <TabsList>
              <TabsTrigger value="products">Produk ({products.length})</TabsTrigger>
              <TabsTrigger value="categories">Kategori ({categories.length})</TabsTrigger>
            </TabsList>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setCategoryDialog(true)}>
                <Tag className="h-4 w-4 mr-1" /> Tambah Kategori
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Produk
              </Button>
            </div>
          </div>

          {/* Products tab */}
          <TabsContent value="products" className="flex-1 overflow-auto mt-3">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left p-3 font-medium">Nama</th>
                    <th className="text-left p-3 font-medium">Kategori</th>
                    <th className="text-left p-3 font-medium">SKU</th>
                    <th className="text-right p-3 font-medium">Harga</th>
                    <th className="text-center p-3 font-medium">Stok</th>
                    <th className="w-24 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3">
                        {p.category && (
                          <Badge variant="outline" style={{ borderColor: p.category.color ?? undefined }}>
                            {p.category.name}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">{p.sku ?? "-"}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(p.price)}</td>
                      <td className="p-3 text-center">
                        <Badge variant={p.track_stock ? "default" : "secondary"}>
                          {p.track_stock ? "Ya" : "Tidak"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8 min-h-0" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 min-h-0 text-destructive"
                            onClick={() => setDeleteConfirm({ open: true, id: p.id, type: "product" })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Belum ada produk</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Categories tab */}
          <TabsContent value="categories" className="flex-1 overflow-auto mt-3">
            <div className="grid grid-cols-3 gap-3">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="h-5 w-5 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? "#6B7280" }} />
                  <span className="flex-1 font-medium">{cat.name}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 min-h-0 text-destructive"
                    onClick={() => setDeleteConfirm({ open: true, id: cat.id, type: "category" })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="col-span-3 text-center p-8 text-muted-foreground">Belum ada kategori</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product dialog */}
      <Dialog open={productDialog.open} onOpenChange={(o) => !o && setProductDialog({ open: false })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{productDialog.product ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Nama Produk *</Label>
              <Input value={pForm.name} onChange={(e) => setPForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Harga (Rp) *</Label>
              <Input type="number" min={0} value={pForm.price} onChange={(e) => setPForm((p) => ({ ...p, price: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Kategori</Label>
              <Select value={pForm.category_id ?? "__none__"} onValueChange={(v) => setPForm((p) => ({ ...p, category_id: v === "__none__" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Tanpa kategori</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>SKU</Label>
              <Input value={pForm.sku ?? ""} onChange={(e) => setPForm((p) => ({ ...p, sku: e.target.value || null }))} />
            </div>
            <div className="space-y-1">
              <Label>Barcode</Label>
              <Input value={pForm.barcode ?? ""} onChange={(e) => setPForm((p) => ({ ...p, barcode: e.target.value || null }))} />
            </div>
            <div className="space-y-1">
              <Label>Satuan</Label>
              <Input value={pForm.unit ?? "pcs"} onChange={(e) => setPForm((p) => ({ ...p, unit: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Pajak (%)</Label>
              <Input type="number" min={0} max={100} value={pForm.tax_rate ?? 0} onChange={(e) => setPForm((p) => ({ ...p, tax_rate: Number(e.target.value) }))} />
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Lacak Stok</p>
                <p className="text-xs text-muted-foreground">Aktifkan untuk memantau stok produk ini</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pForm.track_stock}
                onClick={() => setPForm((p) => ({ ...p, track_stock: !p.track_stock }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${pForm.track_stock ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${pForm.track_stock ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog({ open: false })}>Batal</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!pForm.name || pForm.price <= 0 || saveMut.isPending}>
              {saveMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Kategori</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Kategori *</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Warna</Label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_COLORS.map((c) => (
                  <button key={c} type="button"
                    className={`h-8 w-8 rounded-full transition-all ${catColor === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                    style={{ backgroundColor: c }} onClick={() => setCatColor(c)} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(false)}>Batal</Button>
            <Button onClick={() => saveCatMut.mutate()} disabled={!catName || saveCatMut.isPending}>
              {saveCatMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirm.open} onOpenChange={(o) => !o && setDeleteConfirm({ open: false })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">
            {deleteConfirm.type === "product" ? "Hapus produk ini?" : "Hapus kategori ini?"} Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm({ open: false })}>Batal</Button>
            <Button variant="destructive"
              onClick={() => deleteConfirm.id && deleteConfirm.type && deleteMut.mutate({ id: deleteConfirm.id, type: deleteConfirm.type })}
              disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </AppShell>
  );
}
