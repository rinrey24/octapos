import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { startSyncEngine, stopSyncEngine } from "@/lib/sync/engine";
import LoginPage from "@/pages/LoginPage";
import POSPage from "@/pages/POSPage";
import ProductsPage from "@/pages/products/ProductsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import InventoryPage from "@/pages/InventoryPage";
import CustomersPage from "@/pages/CustomersPage";
import StaffPage from "@/pages/StaffPage";

function SyncBootstrap() {
  const { session } = useAuthStore();

  useEffect(() => {
    if (session?.tenant.id) {
      startSyncEngine(session.tenant.id);
    } else {
      stopSyncEngine();
    }
    return () => { stopSyncEngine(); };
  }, [session?.tenant.id]);

  return null;
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { session } = useAuthStore();
  if (!session) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(session.user.role)) return <Navigate to="/pos" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <SyncBootstrap />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute roles={["owner","admin"]}><ProductsPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute roles={["owner","admin","supervisor"]}><InventoryPage /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute roles={["owner","admin"]}><CustomersPage /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute roles={["owner","admin"]}><StaffPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
