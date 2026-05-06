import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumPad } from "@/components/ui/numpad";
import { openShift } from "@/lib/repositories/shift.repo";
import { useAuthStore } from "@/stores/auth.store";
import { useShiftStore } from "@/stores/shift.store";
import { formatCurrency } from "@octapos/shared-utils";
import { toast } from "@/components/ui/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OpenShiftModal({ open, onClose }: Props) {
  const { session } = useAuthStore();
  const { setCurrentShift } = useShiftStore();
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const openingCash = Number(input) || 0;

  async function handleOpen() {
    if (!session) return;
    setSaving(true);
    try {
      const shift = await openShift(session.outlet.id, session.user.id, openingCash);
      setCurrentShift(shift);
      toast({ title: "Shift dibuka!", description: `Modal awal: ${formatCurrency(openingCash)}` });
      onClose();
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal membuka shift", description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Buka Shift Kasir</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Modal awal (kas di laci)</p>
          <p className="font-mono text-3xl font-bold">
            {input ? formatCurrency(openingCash) : "Rp 0"}
          </p>
        </div>

        <NumPad value={input} onChange={setInput} thousands decimal={false} />

        <Button
          size="lg"
          className="w-full font-bold"
          disabled={saving}
          onClick={() => { void handleOpen(); }}
        >
          {saving ? "Membuka..." : "Buka Shift"}
        </Button>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Batal
        </Button>
      </DialogContent>
    </Dialog>
  );
}
