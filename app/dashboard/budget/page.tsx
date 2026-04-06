import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BudgetClient } from "@/components/budget/BudgetClient";
import type { BudgetItem, BudgetTransaction, BudgetSummary } from "@/types/index";

export default async function BudgetPage({ searchParams }: { searchParams: { year?: string } }) {
  const supabase = (await createServerSupabaseClient()) as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
  if (!tenantId) redirect("/onboarding");

  const { data: role } = await supabase.rpc("get_my_resident_role");
  const canManage = role === "admin" || role === "chairman";

  const year = Number(searchParams?.year ?? new Date().getFullYear());
  const adminSupabase = createServerSupabaseAdminClient();

  // Fetch budget items
  const { data: rawItems } = await adminSupabase
    .from("budget_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("year", year)
    .order("category");

  // Fetch transactions for this year
  const { data: rawTxs } = await adminSupabase
    .from("budget_transactions")
    .select("*, budget_items(category, description)")
    .eq("tenant_id", tenantId)
    .gte("transaction_date", `${year}-01-01`)
    .lte("transaction_date", `${year}-12-31`)
    .order("transaction_date", { ascending: false });

  const txs: BudgetTransaction[] = (rawTxs || []) as BudgetTransaction[];

  // Enrich items with actual amounts
  const items: BudgetItem[] = (rawItems || []).map((item: any) => {
    const itemTxs = txs.filter(t => t.budget_item_id === item.id);
    const expenses = itemTxs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const income   = itemTxs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const actual_amount = expenses - income;
    return {
      ...item,
      planned_amount: Number(item.planned_amount),
      actual_amount,
      variance: Number(item.planned_amount) - actual_amount,
    };
  });

  const totalPlanned = items.reduce((s, i) => s + Number(i.planned_amount), 0);
  const totalActual  = items.reduce((s, i) => s + (i.actual_amount ?? 0), 0);
  const totalIncome  = txs.filter(t => t.budget_item_id == null && t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const pct = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  const summary: BudgetSummary = {
    year,
    total_planned: totalPlanned,
    total_actual: totalActual,
    total_income: totalIncome,
    pct_executed: pct,
  };

  return (
    <BudgetClient
      items={items}
      transactions={txs}
      summary={summary}
      canManage={canManage}
      year={year}
      userId={user.id}
    />
  );
}
