import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא משויך לקהילה" }, { status: 403 });

    const adminSupabase = createServerSupabaseAdminClient();

    const { data: poll, error } = await adminSupabase
      .from("polls")
      .select(`*, poll_options(*), poll_votes(*), poll_participants(*)`)
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !poll) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

    const options = (poll.poll_options || []).map((opt: any) => ({
      ...opt,
      vote_count: (poll.poll_votes || []).filter((v: any) => v.option_id === opt.id).length,
    })).sort((a: any, b: any) => a.order_index - b.order_index);

    const has_voted = (poll.poll_participants || []).some((p: any) => p.user_id === user.id);
    const total_votes = (poll.poll_participants || []).length;

    // For non-anonymous polls, include voter info (admin only)
    let voters = undefined;
    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (!poll.is_anonymous && role === "admin") {
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

    return NextResponse.json({
      data: { ...poll, options, has_voted, total_votes, voters, poll_options: undefined, poll_votes: undefined, poll_participants: undefined },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא משויך לקהילה" }, { status: 403 });

    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (role !== "admin") return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

    const body = await request.json();
    const adminSupabase = createServerSupabaseAdminClient();

    const { data, error } = await adminSupabase
      .from("polls")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (role !== "admin") return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const adminSupabase = createServerSupabaseAdminClient();

    const { error } = await adminSupabase.from("polls").delete().eq("id", params.id).eq("tenant_id", tenantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
