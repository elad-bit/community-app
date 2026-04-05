import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PollsClient } from "@/components/polls/PollsClient";
import type { Poll } from "@/types/index";

export default async function PollsPage() {
  const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
  if (!tenantId) redirect("/onboarding");

  const { data: role } = await supabase.rpc("get_my_resident_role");
  const isAdmin = role === "admin";

  const adminSupabase = createServerSupabaseAdminClient();

  const { data: polls } = await adminSupabase
    .from("polls")
    .select("*, poll_options(*), poll_participants(user_id)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const enriched = (polls || []).map((poll: any) => {
    const participants = poll.poll_participants || [];
    const options = (poll.poll_options || []).sort((a: any, b: any) => a.order_index - b.order_index);
    return {
      ...poll,
      has_voted: participants.some((p: any) => p.user_id === user.id),
      total_votes: participants.length,
      options,
      poll_participants: undefined,
      poll_options: undefined,
    };
  });

  return <PollsClient initialPolls={enriched as Poll[]} isAdmin={isAdmin} userId={user.id} />;
}
