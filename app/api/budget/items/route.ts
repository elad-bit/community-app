import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// GET /api/budget/items?year=2026
export async function GET(req: NextRequest) {
  const supabase = (await createServerSupabaseClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
  if (!tenantId) return NextResponse.json({ error: "לא נמצא טנאנט" }, { status: 400 });

  const year = req.nextUrl.searchParams.get("year") ?? new Date().getFullYear();
  const adminSupabase = createServerSupabaseAdminClient();

  // Fetch items with transactions for actual amount calculation
  const { data: items, error: itemsErr } = await adminSupabase
    .from("budget_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("year", year)
    .order("category");

  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  // Fetch all transactions for this tenant+year to compute actuals
  const { data: txs, error: txErr } = await adminSupabase
    .from("budget_transactions")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("transaction_date", `${year}-01-01`)
    .lte("transaction_date", `${year}-12-31`);

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  // Enrich items with actual amounts
  const enriched = (items || []).map((item: any) => {
    const itemTxs = (txs || []).filter((t: any) => t.budget_item_id === item.id);
    const expenses = itemTxs.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const income   = itemTxs.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const actual_amount = expenses - income;
    return {
      ...item,
      actual_amount,
      variance: Number(item.planned_amount) - actual_amount,
      transactions: itemTxs,
    };
  });

  // Summary
  const totalPlanned = enriched.reduce((s: number, i: any) => s + Number(i.planned_amount), 0);
  const totalActual  = enriched.reduce((s: number, i: any) => s + i.actual_amount, 0);
  const totalIncome  = (txs || []).filter((t: any) => t.budget_item_id == null && t.type === "income")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const pct = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  return NextResponse.json({
    data: enriched,
    summary: { year: Number(year), total_planned: totalPlanned, total_actual: totalActual, total_income: totalIncome, pct_executed: pct },
    transactions: txs || [],
  });
}

// POST /api/budget/items — create new budget item
export async function POST(req: NextRequest) {
  const supabase = (await createServerSupabaseClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
  if (!tenantId) return NextResponse.json({ error: "לא נמצא טנאנט" }, { status: 400 });

  const { data: role } = await supabase.rpc("get_my_resident_role");
  if (!["admin", "chairman"].includes(role)) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const body = await req.json();
  const { category, description, planned_amount, year } = body;
  if (!category || !description || planned_amount == null)
    return NextResponse.json({ error: "שדות חסרים" }, { status: 400 });

  const adminSupabase = createServerSupabaseAdminClient();
  const { data, error } = await adminSupabase
    .from("budget_items")
    .insert({ tenant_id: tenantId, category, description, planned_amount: Number(planned_amount), year: year ?? new Date().getFullYear(), created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
