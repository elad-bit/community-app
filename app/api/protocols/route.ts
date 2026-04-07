import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// GET /api/protocols — list all protocols for the tenant
export async function GET(req: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא נמצא טנאנט" }, { status: 400 });

    const { data: role } = await supabase.rpc("get_my_resident_role");
    const canSeeCommittee = ["admin", "chairman"].includes(role);

    const adminSupabase = createServerSupabaseAdminClient();
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const year = url.searchParams.get("year");

    let query = adminSupabase
      .from("protocols")
      .select(`
        *,
        protocol_decisions(count),
        protocol_signatures(signer_role)
      `)
      .eq("tenant_id", tenantId)
      .order("meeting_date", { ascending: false });

    if (type) query = query.eq("protocol_type", type);
    if (year) {
      query = query
        .gte("meeting_date", `${year}-01-01`)
        .lte("meeting_date", `${year}-12-31`);
    }

    // Non-admin can't see committee protocols
    if (!canSeeCommittee) {
      query = query.neq("protocol_type", "committee");
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/protocols — create a new protocol record
export async function POST(req: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא נמצא טנאנט" }, { status: 400 });

    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (!["admin", "chairman"].includes(role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title, protocol_type, meeting_date, meeting_number,
      location, association_name, chairman_name, community_manager_name,
      participants, absent, guests, agenda,
      file_url, file_type, raw_text,
    } = body;

    if (!title?.trim() || !protocol_type || !meeting_date) {
      return NextResponse.json({ error: "שדות חובה חסרים" }, { status: 400 });
    }

    const adminSupabase = createServerSupabaseAdminClient();
    const { data, error } = await adminSupabase
      .from("protocols")
      .insert({
        tenant_id: tenantId,
        title: title.trim(),
        protocol_type,
        meeting_date,
        meeting_number: meeting_number || null,
        location: location?.trim() || null,
        association_name: association_name?.trim() || null,
        chairman_name: chairman_name?.trim() || null,
        community_manager_name: community_manager_name?.trim() || null,
        participants: participants || [],
        absent: absent || [],
        guests: guests || [],
        agenda: agenda || [],
        file_url: file_url || null,
        file_type: file_type || null,
        raw_text: raw_text || null,
        status: raw_text ? "ready" : "draft",
        ai_processed: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
