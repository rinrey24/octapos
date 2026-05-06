export type UserRole = "owner" | "admin" | "supervisor" | "cashier";

export interface Tenant {
  id: string;
  name: string;
  business_type: string;
  created_at: string;
  updated_at: string;
}

export interface Outlet {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  receipt_header: string | null;
  receipt_footer: string | null;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
}

export interface UserSession {
  user: User;
  outlet: Outlet;
  tenant: Tenant;
  token: string;
}
