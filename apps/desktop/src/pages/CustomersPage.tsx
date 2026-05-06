import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Phone, Mail } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer, type Customer,
} from "@/lib/repositories/customer.repo";
import { useAuthStore } from "@/stores/auth.store";
import { formatCurrency } from "@octapos/shared-utils";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

const EMPTY_FORM: CustomerFormData = { name: "", phone: "", email: "", notes: "" };

export default function CustomersPage() {
  const { session } = useAuthStore();
  const qc = useQueryClient();
  const tenantId = session?.tenant.id ?? "";

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", tenantId],
    queryFn: () => getCustomers(tenantId),
    enabled: !!tenantId,
  });

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(search) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(c: Customer) {
    setEditTarget(c);
    setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", notes: c.notes ?? "" });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateCustomer(editTarget.id, {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
        });
        toast({ title: "Pelanggan diperbarui" });
      } else {
        await createCustomer(tenantId, {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
        });
        toast({ title: "Pelanggan ditambahkan" });
      }
      await qc.invalidateQueries({ queryKey: ["customers", tenantId] });
      setFormOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomer(deleteTarget.id);
      toast({ title: "Pelanggan dihapus" });
      await qc.invalidateQueries({ queryKey: ["customers", tenantId] });
      setDeleteTarget(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menghapus", description: String(e) });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        <div className="shrink-0 border-b bg-card px-6 py-3 flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h1 className="font-semibold text-lg">Pelanggan</h1>
          <div className="ml-auto flex items-center gap-2">
            <Input
              placeholder="Cari nama / HP / email..."
              className="w-60 h-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button size="sm" className="gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Memuat...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
              <Users className="h-10 w-10 opacity-30" />
              <p className="text-sm">{search ? "Tidak ditemukan" : "Belum ada pelanggan"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <div key={c.id} className="border rounded-lg p-4 bg-card flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="font-semibold">{c.name}</div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />{c.phone}
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />{c.email}
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground border-t pt-2 mt-1">
                    <div>
                      <div className="font-medium text-foreground">{c.visit_count}x</div>
                      kunjungan
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{formatCurrency(c.total_spent)}</div>
                      total belanja
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(v) => !v && setFormOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Pelanggan" : "Tambah Pelanggan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nama *</label>
              <Input
                className="mt-1"
                placeholder="Nama lengkap"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">No. HP</label>
              <Input
                className="mt-1"
                placeholder="08xxxxxxxxxx"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                className="mt-1"
                placeholder="email@contoh.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Catatan</label>
              <Input
                className="mt-1"
                placeholder="Catatan (opsional)"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setFormOpen(false)} disabled={saving}>Batal</Button>
            <Button className="flex-1" disabled={!form.name.trim() || saving} onClick={() => { void handleSave(); }}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Pelanggan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hapus <strong>{deleteTarget?.name}</strong>? Data riwayat transaksi tidak ikut terhapus.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)} disabled={deleting}>Batal</Button>
            <Button variant="destructive" className="flex-1" disabled={deleting} onClick={() => { void handleDelete(); }}>
              {deleting ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </AppShell>
  );
}
