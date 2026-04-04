import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  userRole: "admin" | "resident";
  userId: string;
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role, tenants(id, name, slug)")
    .eq("user_id", user.id)
    .single();

  if (!membership) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = membership as any;
  const tenant = m.tenants;
  if (!tenant || Array.isArray(tenant)) return null;

  return {
    tenantId: tenant.id as string,
    tenantName: tenant.name as string,
    tenantSlug: tenant.slug as string,
    userRole: m.role as "admin" | "resident",
    userId: user.id,
  };
}
