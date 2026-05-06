import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, KeyRound, ArrowLeft, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumPad } from "@/components/ui/numpad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth.store";
import {
  isSetupDone, loginOwner, loginCashier,
  getCashiers, getFirstTenant, getFirstOutlet,
} from "@/lib/repositories/auth.repo";
import { seedInitialData } from "@/lib/seed";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import type { User as UserType } from "@octapos/shared-types";

type Screen = "loading" | "setup" | "select-role" | "owner-login" | "cashier-select" | "cashier-pin";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();

  const [screen, setScreen] = useState<Screen>("loading");
  const [cashiers, setCashiers] = useState<UserType[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<UserType | null>(null);
  const [pin, setPin] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Setup form state
  const [setupData, setSetupData] = useState({
    tenantName: "", outletName: "", ownerName: "",
    ownerEmail: "", ownerPassword: "", ownerPassword2: "",
  });

  useEffect(() => {
    isSetupDone()
      .then((done) => setScreen(done ? "select-role" : "setup"))
      .catch(() => setScreen("setup"));
  }, []);

  async function handleSetup() {
    if (!setupData.tenantName || !setupData.outletName || !setupData.ownerEmail || !setupData.ownerPassword) {
      toast({ variant: "destructive", title: "Lengkapi semua field" });
      return;
    }
    if (setupData.ownerPassword !== setupData.ownerPassword2) {
      toast({ variant: "destructive", title: "Password tidak cocok" });
      return;
    }
    setLoading(true);
    try {
      await seedInitialData({
        tenantName: setupData.tenantName,
        outletName: setupData.outletName,
        ownerName: setupData.ownerName || "Owner",
        ownerEmail: setupData.ownerEmail,
        ownerPassword: setupData.ownerPassword,
      });
      toast({ title: "Setup berhasil!", description: "Silakan login." });
      setScreen("select-role");
    } catch (e) {
      toast({ variant: "destructive", title: "Setup gagal", description: String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function handleOwnerLogin() {
    setLoading(true);
    try {
      const user = await loginOwner(ownerEmail, ownerPassword);
      if (!user) {
        toast({ variant: "destructive", title: "Email atau password salah" });
        return;
      }
      await doSetSession(user);
    } catch (e) {
      toast({ variant: "destructive", title: "Login gagal", description: String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function handleCashierSelect(cashier: UserType) {
    setSelectedCashier(cashier);
    setPin("");
    setScreen("cashier-pin");
  }

  async function handleCashierLogin(pinValue?: string) {
    const actualPin = pinValue ?? pin;
    if (!selectedCashier || actualPin.length < 4) return;
    setLoading(true);
    try {
      const user = await loginCashier(selectedCashier.id, actualPin);
      if (!user) {
        toast({ variant: "destructive", title: "PIN salah" });
        setPin("");
        return;
      }
      await doSetSession(user);
    } catch (e) {
      toast({ variant: "destructive", title: "Login gagal", description: String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function doSetSession(user: UserType) {
    const tenant = await getFirstTenant();
    const outlet = tenant ? await getFirstOutlet(tenant.id) : null;
    if (!tenant || !outlet) {
      toast({ variant: "destructive", title: "Data tenant tidak ditemukan" });
      return;
    }
    setSession({ user, tenant, outlet });
    navigate("/pos");
  }

  async function openCashierSelect() {
    const tenant = await getFirstTenant();
    if (!tenant) return;
    const list = await getCashiers(tenant.id);
    setCashiers(list);
    setScreen("cashier-select");
  }

  // ── SCREENS ──────────────────────────────────────────────────────────────

  if (screen === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  if (screen === "setup") {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Setup OctaPOS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Bisnis *</Label>
              <Input placeholder="Restoran Saya" value={setupData.tenantName} onChange={(e) => setSetupData((p) => ({ ...p, tenantName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Nama Outlet *</Label>
              <Input placeholder="Cabang Utama" value={setupData.outletName} onChange={(e) => setSetupData((p) => ({ ...p, outletName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Nama Owner</Label>
              <Input placeholder="John Doe" value={setupData.ownerName} onChange={(e) => setSetupData((p) => ({ ...p, ownerName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Email Owner *</Label>
              <Input type="email" placeholder="owner@bisnis.com" value={setupData.ownerEmail} onChange={(e) => setSetupData((p) => ({ ...p, ownerEmail: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Password *</Label>
              <Input type="password" placeholder="••••••••" value={setupData.ownerPassword} onChange={(e) => setSetupData((p) => ({ ...p, ownerPassword: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Konfirmasi Password *</Label>
              <Input type="password" placeholder="••••••••" value={setupData.ownerPassword2} onChange={(e) => setSetupData((p) => ({ ...p, ownerPassword2: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">Kasir demo dibuat otomatis dengan PIN: 123456</p>
            <Button className="w-full" size="lg" onClick={handleSetup} disabled={loading}>
              {loading ? "Menyiapkan..." : "Mulai Setup"}
            </Button>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  if (screen === "select-role") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-muted/30 gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">OctaPOS</h1>
          <p className="mt-1 text-muted-foreground">Pilih jenis login</p>
        </div>
        <div className="flex gap-4">
          <Button size="xl" variant="outline" className="w-44 flex-col gap-2 h-32" onClick={() => setScreen("owner-login")}>
            <KeyRound className="h-8 w-8" />
            Owner / Admin
          </Button>
          <Button size="xl" className="w-44 flex-col gap-2 h-32" onClick={openCashierSelect}>
            <User className="h-8 w-8" />
            Kasir
          </Button>
        </div>
        <Toaster />
      </div>
    );
  }

  if (screen === "owner-login") {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Login Owner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" placeholder="owner@bisnis.com" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleOwnerLogin()} />
            </div>
            <Button className="w-full" size="lg" onClick={handleOwnerLogin} disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </Button>
            <Button variant="ghost" className="w-full" size="sm" onClick={() => setScreen("select-role")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
            </Button>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  if (screen === "cashier-select") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-muted/30 p-4 gap-4">
        <h2 className="text-2xl font-semibold">Pilih Kasir</h2>
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {cashiers.map((c) => (
            <Button key={c.id} size="xl" variant="outline" className="h-20 text-base" onClick={() => handleCashierSelect(c)}>
              <User className="h-5 w-5 mr-2" />
              {c.full_name}
            </Button>
          ))}
          {cashiers.length === 0 && (
            <p className="col-span-2 text-center text-muted-foreground">Belum ada kasir. Login sebagai owner untuk menambah.</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setScreen("select-role")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>
        <Toaster />
      </div>
    );
  }

  if (screen === "cashier-pin") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-muted/30 p-4 gap-6">
        <div className="text-center">
          <User className="h-12 w-12 text-primary mx-auto mb-2" />
          <h2 className="text-2xl font-semibold">{selectedCashier?.full_name}</h2>
          <p className="text-muted-foreground">Masukkan PIN</p>
        </div>

        {/* PIN dots */}
        <div className="flex gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`w-5 h-5 rounded-full border-2 ${i < pin.length ? "bg-primary border-primary" : "border-border"}`} />
          ))}
        </div>

        <NumPad
          value={pin}
          onChange={(v) => {
            const digits = v.replace(/\D/g, "").slice(0, 6);
            setPin(digits);
            if (digits.length === 6) {
              void handleCashierLogin(digits);
            }
          }}
          maxLength={6}
          className="w-64"
        />

        <Button variant="ghost" size="sm" onClick={() => { setPin(""); setScreen("cashier-select"); }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>
        <Toaster />
      </div>
    );
  }

  return null;
}
