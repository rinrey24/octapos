import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserX, KeyRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth.store";
import { getUsers, createCashier, deactivateUser, updateUserPin } from "@/lib/repositories/auth.repo";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner", admin: "Admin", supervisor: "Supervisor", cashier: "Kasir",
};

export default function StaffPage() {
  const { session } = useAuthStore();
  const qc = useQueryClient();
  const tenantId = session?.tenant.id ?? "";

  const [addOpen, setAddOpen] = useState(false);
  const [pinDialog, setPinDialog] = useState<{ open: boolean; userId?: string; name?: string }>({ open: false });
  const [deactivateTarget, setDeactivateTarget] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });

  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [changePin, setChangePin] = useState("");
  const [changePin2, setChangePin2] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["users", tenantId],
    queryFn: () => getUsers(tenantId),
    enabled: !!tenantId,
  });

  const addMut = useMutation({
    mutationFn: () => createCashier(tenantId, newName.trim(), newPin),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setAddOpen(false);
      setNewName(""); setNewPin(""); setNewPin2("");
      toast({ title: "Kasir ditambahkan" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Gagal", description: String(e) }),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setDeactivateTarget({ open: false });
      toast({ title: "Staff dinonaktifkan" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Gagal", description: String(e) }),
  });

  const pinMut = useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: string }) => updateUserPin(id, pin),
    onSuccess: () => {
      setPinDialog({ open: false });
      setChangePin(""); setChangePin2("");
      toast({ title: "PIN diperbarui" });
    },
    onError: (e) => toast({ variant: "destructive", title: "Gagal", description: String(e) }),
  });

  const canAdd = newName.trim().length >= 2 && newPin.length >= 4 && newPin === newPin2;
  const canChangePin = changePin.length >= 4 && changePin === changePin2;

  return (
    <AppShell>
      <div className="flex h-full flex-col p-4 gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Manajemen Staff</h2>
          <Button size="sm" onClick={() => { setNewName(""); setNewPin(""); setNewPin2(""); setAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Kasir
          </Button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Nama</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="w-32 p-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="p-3 font-medium">{u.full_name}</td>
                  <td className="p-3">
                    <Badge variant={u.role === "owner" ? "default" : "secondary"}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{u.email ?? "—"}</td>
                  <td className="p-3 text-center">
                    <Badge variant={u.is_active ? "default" : "outline"}>
                      {u.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {u.id !== session?.user.id && u.role !== "owner" && u.is_active && (
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8 min-h-0"
                          title="Ganti PIN"
                          onClick={() => { setChangePin(""); setChangePin2(""); setPinDialog({ open: true, userId: u.id, name: u.full_name }); }}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 min-h-0 text-destructive"
                          title="Nonaktifkan"
                          onClick={() => setDeactivateTarget({ open: true, id: u.id, name: u.full_name })}>
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Belum ada staff</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add cashier dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Kasir</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Lengkap *</Label>
              <Input placeholder="John Doe" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>PIN (min 4 digit) *</Label>
              <Input type="password" placeholder="••••••" maxLength={6}
                value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="space-y-1">
              <Label>Konfirmasi PIN *</Label>
              <Input type="password" placeholder="••••••" maxLength={6}
                value={newPin2} onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ""))} />
              {newPin && newPin2 && newPin !== newPin2 && (
                <p className="text-xs text-destructive">PIN tidak cocok</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button onClick={() => addMut.mutate()} disabled={!canAdd || addMut.isPending}>
              {addMut.isPending ? "Menyimpan..." : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change PIN dialog */}
      <Dialog open={pinDialog.open} onOpenChange={(o) => !o && setPinDialog({ open: false })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ganti PIN — {pinDialog.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>PIN Baru *</Label>
              <Input type="password" placeholder="••••••" maxLength={6}
                value={changePin} onChange={(e) => setChangePin(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="space-y-1">
              <Label>Konfirmasi PIN Baru *</Label>
              <Input type="password" placeholder="••••••" maxLength={6}
                value={changePin2} onChange={(e) => setChangePin2(e.target.value.replace(/\D/g, ""))} />
              {changePin && changePin2 && changePin !== changePin2 && (
                <p className="text-xs text-destructive">PIN tidak cocok</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialog({ open: false })}>Batal</Button>
            <Button
              disabled={!canChangePin || pinMut.isPending}
              onClick={() => pinDialog.userId && pinMut.mutate({ id: pinDialog.userId, pin: changePin })}>
              {pinMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirmation */}
      <Dialog open={deactivateTarget.open} onOpenChange={(o) => !o && setDeactivateTarget({ open: false })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nonaktifkan Staff</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">
            Nonaktifkan <strong>{deactivateTarget.name}</strong>? Staff tidak dapat login setelah dinonaktifkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget({ open: false })}>Batal</Button>
            <Button variant="destructive"
              disabled={deactivateMut.isPending}
              onClick={() => deactivateTarget.id && deactivateMut.mutate(deactivateTarget.id)}>
              {deactivateMut.isPending ? "Memproses..." : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </AppShell>
  );
}
