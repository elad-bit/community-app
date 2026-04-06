import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// GET /api/residents/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data, error } = await supabase
      .from("residents")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !data) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/residents/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const body = await request.json();
    const { name, phone, address, role, balance, user_id } = body;
    if (!name?.trim()) return NextResponse.json({ error: "שם הוא שדה חובה" }, { status: 400 });

    // Check role via user client before using admin client
    const { data: userRole } = await supabase.rpc("get_my_resident_role");
    if (!["admin", "chairman"].includes(userRole)) {
      return NextResponse.json({ error: "אין הרשאה — רק מנהל יכול לעדכן תושבים" }, { status: 403 });
    }

    const adminSupabase = createServerSupabaseAdminClient();
    const { data, error } = await adminSupabase
      .from("residents")
      .update({
        name: name.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        role: role || "resident",
        balance: parseFloat(balance) || 0,
        user_id: user_id || null,
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/residents/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: userRole2 } = await supabase.rpc("get_my_resident_role");
    if (!["admin", "chairman"].includes(userRole2)) {
      return NextResponse.json({ error: "אין הרשאה — רק מנהל יכול למחוק תושבים" }, { status: 403 });
    }

    const adminSupabase = createServerSupabaseAdminClient();
    const { error } = await adminSupabase.from("residents").delete().eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
