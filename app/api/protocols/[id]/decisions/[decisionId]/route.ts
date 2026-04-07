import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// PUT /api/protocols/[id]/decisions/[decisionId]
// Approve or reject a decision, optionally creating a task and/or linking a budget item
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; decisionId: string } }
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
    const {
      status,            // "approved" | "rejected"
      create_task,       // boolean
      task_title,
      task_description,
      assigned_to,
      due_date,
      budget_item_id,    // UUID — link to budget_items
      budget_amount,     // NUMERIC — the approved budget amount
    } = body;

    const adminSupabase = createServerSupabaseAdminClient();
    const update: Record<string, unknown> = { status };

    // ── Link budget item when approving ──────────────────────────────────
    if (status === "approved" && budget_item_id) {
      update.linked_budget_item_id = budget_item_id;
      if (budget_amount != null) update.budget_amount = Number(budget_amount);
    }

    // ── Create task when approving ───────────────────────────────────────
    if (status === "approved" && create_task) {
      const { data: task, error: taskError } = await adminSupabase
        .from("tasks")
        .insert({
          tenant_id: tenantId,
          title: task_title || `החלטה מפרוטוקול`,
          description: task_description || null,
          assigned_to: assigned_to || null,
          due_date: due_date || null,
          status: "pending",
          created_by: user.id,
        })
        .select()
        .single();

      if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });
      update.linked_task_id = task.id;
    }

    // ── Update the decision ──────────────────────────────────────────────
    const { data, error } = await adminSupabase
      .from("protocol_decisions")
      .update(update)
      .eq("id", params.decisionId)
      .eq("protocol_id", params.id)
      .select(`
        *,
        tasks(id, title, status),
        budget_items:linked_budget_item_id(id, description, category, planned_amount, year)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ── Auto-create budget transaction when budget item is linked ────────
    if (status === "approved" && budget_item_id && budget_amount) {
      // Fetch protocol title for the transaction description
      const { data: protocol } = await adminSupabase
        .from("protocols")
        .select("title, meeting_date")
        .eq("id", params.id)
        .single();

      const protocolLabel = protocol
        ? `פרוטוקול: ${protocol.title} (${new Date(protocol.meeting_date).toLocaleDateString("he-IL")})`
        : "פרוטוקול ועד";

      const decisionSnippet = data.decision_text?.substring(0, 80) ?? "";

      await adminSupabase
        .from("budget_transactions")
        .insert({
          tenant_id: tenantId,
          budget_item_id,
          protocol_decision_id: params.decisionId,
          type: "expense",
          amount: Number(budget_amount),
          description: `${decisionSnippet}${data.decision_text?.length > 80 ? "..." : ""}`,
          supplier: null,
          transaction_date: new Date().toISOString().split("T")[0],
          source: "manual",
          notes: protocolLabel,
        });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/protocols/[id]/decisions/[decisionId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; decisionId: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (!["admin", "chairman"].includes(role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const adminSupabase = createServerSupabaseAdminClient();
    const { error } = await adminSupabase
      .from("protocol_decisions")
      .delete()
      .eq("id", params.decisionId)
      .eq("protocol_id", params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
