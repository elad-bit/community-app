import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// GET /api/polls
export async function GET() {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא משויך לקהילה" }, { status: 403 });

    const adminSupabase = createServerSupabaseAdminClient();

    const { data: polls, error } = await adminSupabase
      .from("polls")
      .select(`*, poll_options(*), poll_participants(user_id)`)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Add has_voted flag and total_votes
    const enriched = (polls || []).map((poll: any) => {
      const participants = poll.poll_participants || [];
      const options = poll.poll_options || [];
      return {
        ...poll,
        has_voted: participants.some((p: any) => p.user_id === user.id),
        total_votes: participants.length,
        poll_participants: undefined,
        options,
        poll_options: undefined,
      };
    });

    return NextResponse.json({ data: enriched });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/polls
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא משויך לקהילה" }, { status: 403 });

    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (role !== "admin") return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

    const body = await request.json();
    const { title, description, type, category, is_anonymous, options, starts_at, ends_at } = body;

    if (!title?.trim()) return NextResponse.json({ error: "כותרת חובה" }, { status: 400 });
    if (!options || options.length < 2) return NextResponse.json({ error: "נדרשות לפחות 2 אפשרויות" }, { status: 400 });

    const adminSupabase = createServerSupabaseAdminClient();

    const { data: poll, error: pollError } = await adminSupabase
      .from("polls")
      .insert({
        tenant_id: tenantId,
        title: title.trim(),
        description: description?.trim() || null,
        type: type || "general_assembly",
        category: category || "general",
        is_anonymous: !!is_anonymous,
        status: "draft",
        created_by: user.id,
        starts_at: starts_at || null,
        ends_at: ends_at || null,
      })
      .select()
      .single();

    if (pollError) return NextResponse.json({ error: pollError.message }, { status: 500 });

    const optionsToInsert = options.map((text: string, i: number) => ({
      poll_id: poll.id,
      text: text.trim(),
      order_index: i,
    }));

    const { error: optError } = await adminSupabase.from("poll_options").insert(optionsToInsert);
    if (optError) return NextResponse.json({ error: optError.message }, { status: 500 });

    return NextResponse.json({ data: poll }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
