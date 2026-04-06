import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// POST /api/budget/transactions — add transaction
export async function POST(req: NextRequest) {
  const supabase = (await createServerSupabaseClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
  if (!tenantId) return NextResponse.json({ error: "לא נמצא טנאנט" }, { status: 400 });

  const { data: role } = await supabase.rpc("get_my_resident_role");
  if (!["admin", "chairman"].includes(role)) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const body = await req.json();
  const { type, amount, description, supplier, transaction_date, budget_item_id, source, external_id } = body;

  if (!type || !amount || !description || !transaction_date)
    return NextResponse.json({ error: "שדות חסרים" }, { status: 400 });

  const adminSupabase = createServerSupabaseAdminClient();
  const { data, error } = await adminSupabase
    .from("budget_transactions")
    .insert({
      tenant_id: tenantId,
      type,
      amount: Number(amount),
      description,
      supplier: supplier || null,
      transaction_date,
      budget_item_id: budget_item_id || null,
      source: source || "manual",
      external_id: external_id || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

// DELETE /api/budget/transactions?id=xxx
export async function DELETE(req: NextRequest) {
  const supabase = (await createServerSupabaseClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { data: role } = await supabase.rpc("get_my_resident_role");
  if (!["admin", "chairman"].includes(role)) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "חסר id" }, { status: 400 });

  const adminSupabase = createServerSupabaseAdminClient();
  const { error } = await adminSupabase.from("budget_transactions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
