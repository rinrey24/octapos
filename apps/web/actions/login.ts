"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(
  email: string,
  password: string
): Promise<{ error: string } | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const admin = createAdminClient();

  // Verify this email belongs to an active owner or admin in public.users
  const { data: publicUser } = await admin
    .from("users")
    .select("id, email, role, is_active")
    .eq("email", normalizedEmail)
    .in("role", ["owner", "admin"])
    .eq("is_active", true)
    .maybeSingle();

  if (!publicUser) {
    return { error: "Email atau password salah. Silakan coba lagi." };
  }

  // On first web login, the auth.users account may not exist yet — create it
  const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingAuthUser = listData?.users.find(
    (u) => u.email?.toLowerCase() === normalizedEmail
  );

  if (!existingAuthUser) {
    const { error: createErr } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });
    if (createErr) {
      return { error: `Gagal membuat akun: ${createErr.message}` };
    }
  }

  // Sign in via server-side client so session cookie is set
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (signInErr) {
    return { error: "Email atau password salah. Silakan coba lagi." };
  }

  redirect("/dashboard");
}
