import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// GET /api/protocols/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא נמצא טנאנט" }, { status: 400 });

    const { data: role } = await supabase.rpc("get_my_resident_role");
    const canSeeCommittee = ["admin", "chairman"].includes(role);

    const adminSupabase = createServerSupabaseAdminClient();
    const { data, error } = await adminSupabase
      .from("protocols")
      .select(`
        *,
        protocol_decisions(*, tasks(id, title, status)),
        protocol_signatures(*)
      `)
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !data) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

    // Block non-admin from committee protocols
    if (data.protocol_type === "committee" && !canSeeCommittee) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    // Sort decisions by order_index
    if (data.protocol_decisions) {
      data.protocol_decisions.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/protocols/[id] — update metadata
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const adminSupabase = createServerSupabaseAdminClient();

    const { data, error } = await adminSupabase
      .from("protocols")
      .update({ ...body, updated_at: new Date().toISOString() })
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

// DELETE /api/protocols/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (!["admin", "chairman"].includes(role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const adminSupabase = createServerSupabaseAdminClient();
    const { error } = await adminSupabase
      .from("protocols")
      .delete()
      .eq("id", params.id)
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
