import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteClient } from "@/components/settings/InviteClient";

export default async function InvitePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createServerSupabaseClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role, tenants(id, name, slug)")
    .eq("user_id", user.id)
    .single();

  const isAdmin  = membership?.role === "admin";
  const tenant   = membership?.tenants ?? null;

  // Fetch current members with their resident info
  const { data: members } = await supabase
    .from("tenant_members")
    .select("user_id, role, residents(name, phone, avatar_url)")
    .eq("tenant_id", tenant?.id ?? "");

  return (
    <InviteClient
      tenant={tenant}
      isAdmin={isAdmin}
      members={(members as {
        user_id: string;
        role: string;
        residents: { name: string; phone?: string; avatar_url?: string } | null;
      }[]) ?? []}
    />
  );
}
