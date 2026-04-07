import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// PUT /api/protocols/[id]/decisions/[decisionId]
// Approve or reject a decision, optionally creating a task
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
      status,          // "approved" | "rejected"
      create_task,     // boolean
      task_title,      // optional custom task title
      task_description,
      assigned_to,
      due_date,
    } = body;

    const adminSupabase = createServerSupabaseAdminClient();

    const update: Record<string, unknown> = { status };

    // If approving and create_task requested, create a task linked to this decision
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

    const { data, error } = await adminSupabase
      .from("protocol_decisions")
      .update(update)
      .eq("id", params.decisionId)
      .eq("protocol_id", params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
