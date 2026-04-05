import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא משויך לקהילה" }, { status: 403 });

    const adminSupabase = createServerSupabaseAdminClient();

    // Check poll is open
    const { data: poll, error: pollError } = await adminSupabase
      .from("polls")
      .select("id, status, is_anonymous, type")
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .single();

    if (pollError || !poll) return NextResponse.json({ error: "הצבעה לא נמצאה" }, { status: 404 });
    if (poll.status !== "open") return NextResponse.json({ error: "ההצבעה אינה פתוחה" }, { status: 400 });

    // Check hasn't voted
    const { data: existing } = await adminSupabase
      .from("poll_participants")
      .select("id")
      .eq("poll_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (existing) return NextResponse.json({ error: "כבר הצבעת בהצבעה זו" }, { status: 409 });

    // For committee polls, check user is admin
    if (poll.type === "committee") {
      const { data: role } = await supabase.rpc("get_my_resident_role");
      if (role !== "admin") return NextResponse.json({ error: "הצבעה זו מיועדת לחברי ועד בלבד" }, { status: 403 });
    }

    const { option_id } = await request.json();
    if (!option_id) return NextResponse.json({ error: "נדרש לבחור אפשרות" }, { status: 400 });

    // Verify option belongs to this poll
    const { data: option } = await adminSupabase
      .from("poll_options")
      .select("id")
      .eq("id", option_id)
      .eq("poll_id", params.id)
      .single();

    if (!option) return NextResponse.json({ error: "אפשרות לא תקינה" }, { status: 400 });

    // Record vote (voter_id is null for anonymous)
    const { error: voteError } = await adminSupabase
      .from("poll_votes")
      .insert({
        poll_id: params.id,
        option_id,
        tenant_id: tenantId,
        voter_id: poll.is_anonymous ? null : user.id,
      });

    if (voteError) return NextResponse.json({ error: voteError.message }, { status: 500 });

    // Record participation (always, for double-vote prevention)
    const { error: partError } = await adminSupabase
      .from("poll_participants")
      .insert({ poll_id: params.id, user_id: user.id });

    if (partError) return NextResponse.json({ error: partError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
