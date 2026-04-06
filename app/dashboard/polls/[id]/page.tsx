import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PollDetailClient } from "@/components/polls/PollDetailClient";
import type { Poll } from "@/types/index";

export default async function PollDetailPage({ params }: { params: { id: string } }) {
  const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
  if (!tenantId) redirect("/onboarding");

  const { data: role } = await supabase.rpc("get_my_resident_role");
  const isAdmin = role === "admin";
  const canManage = role === "admin" || role === "chairman";

  const adminSupabase = createServerSupabaseAdminClient();

  const { data: poll, error } = await adminSupabase
    .from("polls")
    .select(`*, poll_options(*), poll_votes(*), poll_participants(*)`)
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !poll) notFound();

  const options = (poll.poll_options || [])
    .map((opt: any) => ({
      ...opt,
      vote_count: (poll.poll_votes || []).filter((v: any) => v.option_id === opt.id).length,
    }))
    .sort((a: any, b: any) => a.order_index - b.order_index);

  const has_voted = (poll.poll_participants || []).some((p: any) => p.user_id === user.id);
  const total_votes = (poll.poll_participants || []).length;

  let voters = undefined;
  if (!poll.is_anonymous && canManage) {
    const { data: residents } = await adminSupabase
      .from("residents")
      .select("user_id, name")
      .eq("tenant_id", tenantId);
    voters = (poll.poll_participants || []).map((p: any) => ({
      user_id: p.user_id,
      name: (residents || []).find((r: any) => r.user_id === p.user_id)?.name || "תושב",
      voted_at: p.voted_at,
    }));
  }

  const enrichedPoll: Poll = {
    ...poll,
    options,
    has_voted,
    total_votes,
    voters,
    poll_options: undefined,
    poll_votes: undefined,
    poll_participants: undefined,
  };

  return (
    <PollDetailClient
      poll={enrichedPoll}
      isAdmin={isAdmin}
      canManage={canManage}
      userId={user.id}
    />
  );
}
