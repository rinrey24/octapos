import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantId } from "@/lib/queries";
import DashboardShell from "@/components/layout/DashboardShell";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Resolve outlet name for sidebar
  const tenantId = await resolveTenantId(user.email ?? "");
  let outletName: string | undefined;

  if (tenantId) {
    const admin = createAdminClient();
    const { data: outlet } = await admin
      .from("outlets")
      .select("name")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();
    outletName = (outlet?.name as string | undefined) ?? undefined;
  }

  return (
    <DashboardShell {...(outletName !== undefined ? { outletName } : {})}>
      {children}
    </DashboardShell>
  );
}
