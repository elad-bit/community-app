import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CommunitySettingsClient } from "@/components/settings/CommunitySettingsClient";

export default async function CommunitySettingsPage() {
  const supabase = (await createServerSupabaseClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role, tenants(id, name, slug, city, logo_url)")
    .eq("user_id", user.id)
    .single();

  const isAdmin = membership?.role === "admin";
  const tenant  = membership?.tenants ?? null;

  return <CommunitySettingsClient tenant={tenant} isAdmin={isAdmin} />;
}
