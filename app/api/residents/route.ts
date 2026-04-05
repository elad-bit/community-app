import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/residents
export async function GET() {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data, error } = await supabase
      .from("residents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/residents
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא משויך לקהילה" }, { status: 403 });

    const body = await request.json();
    const { name, phone, address, role, balance, user_id } = body;
    if (!name?.trim()) return NextResponse.json({ error: "שם הוא שדה חובה" }, { status: 400 });

    const { data, error } = await supabase
      .from("residents")
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        role: role || "resident",
        balance: parseFloat(balance) || 0,
        user_id: user_id || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "42501") {
        return NextResponse.json({ error: "אין הרשאה — רק מנהל יכול להוסיף תושבים" }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
