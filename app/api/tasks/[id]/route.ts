import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// PATCH /api/tasks/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const body = await request.json();
    const fields: Record<string, unknown> = {};
    if (body.status !== undefined)      fields.status      = body.status;
    if (body.title !== undefined)       fields.title       = body.title?.trim();
    if (body.description !== undefined) fields.description = body.description?.trim() || null;
    if (body.assigned_to !== undefined) fields.assigned_to = body.assigned_to || null;
    if (body.due_date !== undefined)    fields.due_date    = body.due_date || null;
    if (body.request_id !== undefined)  fields.request_id  = body.request_id || null;

    const { data, error } = await supabase
      .from("tasks")
      .update(fields)
      .eq("id", params.id)
      .select("*, residents(name), requests(title)")
      .single();

    if (error) {
      if (error.code === "42501") return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { error } = await supabase.from("tasks").delete().eq("id", params.id);
    if (error) {
      if (error.code === "42501") return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
