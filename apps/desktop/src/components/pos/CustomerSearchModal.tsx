import { useState, useEffect } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchCustomers, createCustomer, type Customer } from "@/lib/repositories/customer.repo";
import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  onSelect: (id: string, name: string) => void;
  onClear: () => void;
  onClose: () => void;
  currentCustomerId: string | null;
}

export function CustomerSearchModal({ open, onSelect, onClear, onClose, currentCustomerId }: Props) {
  const { session } = useAuthStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setShowCreate(false);
      setNewName("");
      setNewPhone("");
    }
  }, [open]);

  useEffect(() => {
    if (!session || query.trim().length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchCustomers(session.tenant.id, query.trim())
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, session]);

  async function handleCreate() {
    if (!session || !newName.trim()) return;
    setCreating(true);
    try {
      const c = await createCustomer(session.tenant.id, {
        name: newName.trim(),
        phone: newPhone.trim() || null,
      });
      toast({ title: "Pelanggan ditambahkan", description: c.name });
      onSelect(c.id, c.name);
      onClose();
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menambah pelanggan", description: String(e) });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pilih Pelanggan</DialogTitle>
        </DialogHeader>

        {currentCustomerId && (
          <Button variant="outline" size="sm" className="gap-1 self-start text-destructive" onClick={() => { onClear(); onClose(); }}>
            <X className="h-4 w-4" /> Hapus Pelanggan
          </Button>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama / no. HP..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {!showCreate ? (
          <>
            <div className="max-h-56 overflow-y-auto space-y-1">
              {searching && (
                <p className="text-xs text-muted-foreground text-center py-2">Mencari...</p>
              )}
              {!searching && query.length > 0 && results.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Tidak ditemukan</p>
              )}
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onSelect(c.id, c.name); onClose(); }}
                  className="w-full text-left rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                >
                  <div className="font-medium text-sm">{c.name}</div>
                  {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" className="gap-1 self-start" onClick={() => setShowCreate(true)}>
              <UserPlus className="h-4 w-4" /> Pelanggan Baru
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Nama pelanggan *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="No. HP (opsional)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Kembali</Button>
              <Button
                className="flex-1"
                disabled={!newName.trim() || creating}
                onClick={() => { void handleCreate(); }}
              >
                {creating ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
