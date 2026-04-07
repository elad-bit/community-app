import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProtocolDetailClient } from "@/components/protocols/ProtocolDetailClient";

export default async function ProtocolDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = (await createServerSupabaseClient()) as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
  if (!tenantId) redirect("/onboarding");

  const { data: role } = await supabase.rpc("get_my_resident_role");
  const canManage = role === "admin" || role === "chairman";

  const adminSupabase = createServerSupabaseAdminClient();
  const { data: protocol, error } = await adminSupabase
    .from("protocols")
    .select(`
      *,
      protocol_decisions(*, tasks(id, title, status)),
      protocol_signatures(*)
    `)
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !protocol) notFound();

  // Block non-admin from committee protocols
  if (protocol.protocol_type === "committee" && !canManage) {
    redirect("/dashboard/protocols");
  }

  // Sort decisions
  if (protocol.protocol_decisions) {
    protocol.protocol_decisions.sort((a: any, b: any) => a.order_index - b.order_index);
  }

  return (
    <ProtocolDetailClient
      protocol={protocol as any}
      canManage={canManage}
    />
  );
}
