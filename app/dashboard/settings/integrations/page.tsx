import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { IntegrationsClient } from "@/components/settings/IntegrationsClient";

export default async function IntegrationsPage() {
  const supabase = (await createServerSupabaseClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isAdmin = membership?.role === "admin";

  return <IntegrationsClient isAdmin={isAdmin} />;
}
