import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// GET /api/units
export async function GET(_req: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא נמצא טנאנט" }, { status: 400 });

    const adminSupabase = createServerSupabaseAdminClient();

    const [{ data: units, error }, { data: balances }] = await Promise.all([
      adminSupabase
        .from("units")
        .select(`*, residents(id, name, phone, type:role, is_active:role, user_id)`)
        .eq("tenant_id", tenantId)
        .order("unit_number"),
      adminSupabase
        .from("unit_balance")
        .select("*")
        .eq("tenant_id", tenantId),
    ]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const balanceMap = new Map((balances || []).map((b: any) => [b.unit_id, b]));
    const enriched = (units || []).map((u: any) => ({
      ...u,
      balance_info: balanceMap.get(u.id) ?? {
        total_charged: 0, total_paid: 0, balance: 0, open_charges_count: 0,
      },
    }));

    return NextResponse.json({ data: enriched });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/units
export async function POST(req: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (!["admin", "chairman"].includes(role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { unit_number, floor, building, area_sqm, notes } = await req.json();
    if (!unit_number?.trim()) {
      return NextResponse.json({ error: "מספר דירה הוא שדה חובה" }, { status: 400 });
    }

    const adminSupabase = createServerSupabaseAdminClient();
    const { data, error } = await adminSupabase
      .from("units")
      .insert({ tenant_id: tenantId, unit_number: unit_number.trim(), floor, building, area_sqm, notes })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/units?id=xxx
export async function PATCH(req: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (!["admin", "chairman"].includes(role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

    const body = await req.json();
    const adminSupabase = createServerSupabaseAdminClient();
    const { data, error } = await adminSupabase
      .from("units")
      .update(body)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/units?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (!["admin", "chairman"].includes(role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

    const adminSupabase = createServerSupabaseAdminClient();
    const { error } = await adminSupabase
      .from("units")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
