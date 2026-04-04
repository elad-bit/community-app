import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// PATCH /api/requests/[id] — עדכון סטטוס / פרטים
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const body = await request.json();
    const allowedFields: Record<string, unknown> = {};
    if (body.status)      allowedFields.status      = body.status;
    if (body.title)       allowedFields.title        = body.title.trim();
    if (body.description !== undefined) allowedFields.description = body.description?.trim() || null;

    const { data, error } = await supabase
      .from("requests")
      .update(allowedFields)
      .eq("id", params.id)
      .select("*, residents(name)")
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

// DELETE /api/requests/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { error } = await supabase.from("requests").delete().eq("id", params.id);
    if (error) {
      if (error.code === "42501") return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
