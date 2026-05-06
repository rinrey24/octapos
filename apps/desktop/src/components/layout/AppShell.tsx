import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Package, ClipboardList, LogOut, Users, Boxes, PlayCircle, StopCircle, PauseCircle, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth.store";
import { useShiftStore } from "@/stores/shift.store";
import { formatDateTime } from "@octapos/shared-utils";
import SyncIndicator from "@/components/sync/SyncIndicator";
import SyncSettingsModal from "@/components/sync/SyncSettingsModal";
import { OpenShiftModal } from "@/components/shift/OpenShiftModal";
import { CloseShiftModal } from "@/components/shift/CloseShiftModal";
import { getOpenShift } from "@/lib/repositories/shift.repo";
import { useParkedStore } from "@/stores/parked.store";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { session, logout } = useAuthStore();
  const { currentShift, setCurrentShift } = useShiftStore();
  const parkedCount = useParkedStore((s) => s.parked.length);
  const setOpenParkedModal = useParkedStore((s) => s.setOpenModal);
  const navigate = useNavigate();
  const location = useLocation();
  const [syncSettingsOpen, setSyncSettingsOpen] = useState(false);
  const [openShiftOpen, setOpenShiftOpen] = useState(false);
  const [closeShiftOpen, setCloseShiftOpen] = useState(false);

  // Restore open shift on mount
  useEffect(() => {
    if (session?.outlet.id && !currentShift) {
      getOpenShift(session.outlet.id)
        .then((shift) => { if (shift) setCurrentShift(shift); })
        .catch(() => {});
    }
  }, [session?.outlet.id, currentShift, setCurrentShift]);

  const role = session?.user.role ?? "cashier";
  const isOwner = role === "owner" || role === "admin";
  const isSupervisor = isOwner || role === "supervisor";

  const allNavItems = [
    { path: "/pos", label: "Kasir", icon: ShoppingCart, show: true },
    { path: "/products", label: "Produk", icon: Package, show: isOwner },
    { path: "/inventory", label: "Inventori", icon: Boxes, show: isSupervisor },
    { path: "/customers", label: "Pelanggan", icon: Users, show: isOwner },
    { path: "/transactions", label: "Riwayat", icon: ClipboardList, show: true },
    { path: "/staff", label: "Staff", icon: UserCog, show: isOwner },
  ];
  const navItems = allNavItems.filter((item) => item.show);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
        <span className="font-bold text-primary">OctaPOS</span>
        <Separator orientation="vertical" className="h-6" />
        <span className="text-sm text-muted-foreground">{session?.outlet.name}</span>
        <Separator orientation="vertical" className="h-6" />
        <span className="text-sm text-muted-foreground">{session?.user.full_name}</span>
        <span className="text-sm text-muted-foreground hidden xl:block">
          — {formatDateTime(new Date())}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <div className="bg-indigo-700 rounded-md flex items-center px-1">
            <SyncIndicator onSettings={() => setSyncSettingsOpen(true)} />
          </div>
          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Shift indicator */}
          {currentShift ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-green-600 hover:text-destructive"
              onClick={() => setCloseShiftOpen(true)}
            >
              <StopCircle className="h-4 w-4" />
              <span className="hidden lg:inline">Tutup Shift</span>
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">Aktif</Badge>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setOpenShiftOpen(true)}
            >
              <PlayCircle className="h-4 w-4" />
              <span className="hidden lg:inline">Buka Shift</span>
            </Button>
          )}
          {parkedCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-amber-400 text-amber-600"
                onClick={() => { setOpenParkedModal(true); navigate("/pos"); }}
              >
                <PauseCircle className="h-4 w-4" />
                <span className="hidden lg:inline">{parkedCount} Ditahan</span>
              </Button>
            </>
          )}
          <Separator orientation="vertical" className="h-6 mx-1" />

          {navItems.map(({ path, label, icon: Icon }) => (
            <Button
              key={path}
              variant={location.pathname === path ? "default" : "ghost"}
              size="sm"
              className="gap-1.5"
              onClick={() => navigate(path)}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden lg:inline">{label}</span>
            </Button>
          ))}
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button variant="ghost" size="icon" className="h-10 w-10" title="Logout" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>

      <SyncSettingsModal open={syncSettingsOpen} onClose={() => setSyncSettingsOpen(false)} />
      <OpenShiftModal open={openShiftOpen} onClose={() => setOpenShiftOpen(false)} />
      <CloseShiftModal open={closeShiftOpen} onClose={() => setCloseShiftOpen(false)} />
    </div>
  );
}
