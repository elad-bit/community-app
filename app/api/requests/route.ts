import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/requests
export async function GET() {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data, error } = await supabase
      .from("requests")
      .select("*, residents(name)")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/requests — פתיחת פנייה חדשה
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא משויך לקהילה" }, { status: 403 });

    // שליפת ה-resident_id של המשתמש הנוכחי
    const { data: resident } = await supabase
      .from("residents")
      .select("id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single();

    const body = await request.json();
    const { title, description, resident_id } = body;
    if (!title?.trim()) return NextResponse.json({ error: "כותרת היא שדה חובה" }, { status: 400 });

    const { data, error } = await supabase
      .from("requests")
      .insert({
        tenant_id: tenantId,
        resident_id: resident_id || resident?.id || null,
        title: title.trim(),
        description: description?.trim() || null,
        status: "new",
        created_by: user.id,
      })
      .select("*, residents(name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
