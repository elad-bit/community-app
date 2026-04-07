import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// POST /api/protocols/[id]/sign
export async function POST(
  req: NextRequest,
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

    const body = await req.json();
    const { signer_role, signature_data } = body;

    if (!signer_role || !signature_data) {
      return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
    }

    if (!["chairman", "community_manager", "committee_seal"].includes(signer_role)) {
      return NextResponse.json({ error: "תפקיד חתימה לא תקין" }, { status: 400 });
    }

    const adminSupabase = createServerSupabaseAdminClient();

    // Verify protocol belongs to this tenant
    const { data: protocol } = await adminSupabase
      .from("protocols")
      .select("id")
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .single();

    if (!protocol) return NextResponse.json({ error: "פרוטוקול לא נמצא" }, { status: 404 });

    // Upsert signature
    const { data, error } = await adminSupabase
      .from("protocol_signatures")
      .upsert({
        protocol_id: params.id,
        signer_role,
        signature_data,
        signed_at: new Date().toISOString(),
        signed_by: user.id,
      }, { onConflict: "protocol_id,signer_role" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Check if all 3 signatures present — auto-approve
    const { count } = await adminSupabase
      .from("protocol_signatures")
      .select("*", { count: "exact", head: true })
      .eq("protocol_id", params.id);

    if (count && count >= 2) {
      await adminSupabase
        .from("protocols")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", params.id);
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/protocols/[id]/sign?role=chairman
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (!["admin", "chairman"].includes(role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const signerRole = req.nextUrl.searchParams.get("role");
    if (!signerRole) return NextResponse.json({ error: "חסר role" }, { status: 400 });

    const adminSupabase = createServerSupabaseAdminClient();
    const { error } = await adminSupabase
      .from("protocol_signatures")
      .delete()
      .eq("protocol_id", params.id)
      .eq("signer_role", signerRole);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
