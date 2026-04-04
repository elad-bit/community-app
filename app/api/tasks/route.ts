import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/tasks
export async function GET() {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data, error } = await supabase
      .from("tasks")
      .select("*, residents(name), requests(title)")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/tasks — יצירת משימה (מנהל בלבד, RLS אוכף)
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא משויך לקהילה" }, { status: 403 });

    const body = await request.json();
    const { title, description, assigned_to, request_id, status, due_date } = body;
    if (!title?.trim()) return NextResponse.json({ error: "כותרת היא שדה חובה" }, { status: 400 });

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        tenant_id: tenantId,
        request_id: request_id || null,
        title: title.trim(),
        description: description?.trim() || null,
        assigned_to: assigned_to || null,
        status: status || "pending",
        due_date: due_date || null,
        created_by: user.id,
      })
      .select("*, residents(name), requests(title)")
      .single();

    if (error) {
      if (error.code === "42501") return NextResponse.json({ error: "אין הרשאה — רק מנהל יוצר משימות" }, { status: 403 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
