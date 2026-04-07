import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProtocolsClient } from "@/components/protocols/ProtocolsClient";
import type { Protocol } from "@/types/index";

export default async function ProtocolsPage({
  searchParams,
}: {
  searchParams?: { type?: string; year?: string };
}) {
  const supabase = (await createServerSupabaseClient()) as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
  if (!tenantId) redirect("/onboarding");

  const { data: role } = await supabase.rpc("get_my_resident_role");
  const canManage = role === "admin" || role === "chairman";
  const canSeeCommittee = canManage;

  const adminSupabase = createServerSupabaseAdminClient();

  let query = adminSupabase
    .from("protocols")
    .select(`
      *,
      protocol_decisions(count),
      protocol_signatures(signer_role)
    `)
    .eq("tenant_id", tenantId)
    .order("meeting_date", { ascending: false });

  if (searchParams?.type) query = query.eq("protocol_type", searchParams.type);
  if (searchParams?.year) {
    query = query
      .gte("meeting_date", `${searchParams.year}-01-01`)
      .lte("meeting_date", `${searchParams.year}-12-31`);
  }
  if (!canSeeCommittee) {
    query = query.neq("protocol_type", "committee");
  }

  const { data: rawProtocols } = await query;
  const protocols: Protocol[] = (rawProtocols || []) as Protocol[];

  return (
    <ProtocolsClient
      protocols={protocols}
      canManage={canManage}
    />
  );
}
