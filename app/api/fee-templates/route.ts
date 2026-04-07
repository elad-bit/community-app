import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// GET /api/fee-templates
export async function GET(_req: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא נמצא טנאנט" }, { status: 400 });

    const adminSupabase = createServerSupabaseAdminClient();
    const { data, error } = await adminSupabase
      .from("fee_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/fee-templates
export async function POST(req: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (!["admin", "chairman"].includes(role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { name, amount, frequency, applies_to, budget_item_id } = await req.json();
    if (!name?.trim() || !amount) {
      return NextResponse.json({ error: "שם וסכום הם שדות חובה" }, { status: 400 });
    }

    const adminSupabase = createServerSupabaseAdminClient();
    const { data, error } = await adminSupabase
      .from("fee_templates")
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        amount: Number(amount),
        frequency: frequency || "monthly",
        applies_to: applies_to || "all",
        budget_item_id: budget_item_id || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
