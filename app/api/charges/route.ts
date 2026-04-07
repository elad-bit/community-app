import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// GET /api/charges?unit_id=&status=&year=
export async function GET(req: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא נמצא טנאנט" }, { status: 400 });

    const unitId = req.nextUrl.searchParams.get("unit_id");
    const status = req.nextUrl.searchParams.get("status");
    const year   = req.nextUrl.searchParams.get("year");

    const adminSupabase = createServerSupabaseAdminClient();
    let query = adminSupabase
      .from("charges")
      .select(`
        *,
        units(id, unit_number, building),
        residents(id, name, phone),
        payments(id, amount, payment_date, method, reference)
      `)
      .eq("tenant_id", tenantId)
      .order("due_date", { ascending: false });

    if (unitId)  query = query.eq("unit_id", unitId);
    if (status)  query = query.eq("status", status);
    if (year)    query = query.eq("period_year", Number(year));

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Enrich: compute paid_amount and remaining per charge
    const enriched = (data || []).map((c: any) => {
      const paid = (c.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      return { ...c, paid_amount: paid, remaining: Number(c.amount) - paid };
    });

    return NextResponse.json({ data: enriched });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/charges — create charge(s)
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

    const body = await req.json();
    const {
      unit_id, resident_id, fee_template_id,
      description, amount, due_date,
      period_month, period_year, notes,
      // bulk: generate charges for all units
      bulk, unit_ids,
    } = body;

    const adminSupabase = createServerSupabaseAdminClient();

    if (bulk && Array.isArray(unit_ids) && unit_ids.length > 0) {
      // Bulk: create one charge per unit
      const rows = unit_ids.map((uid: string) => ({
        tenant_id: tenantId,
        unit_id: uid,
        resident_id: resident_id || null,
        fee_template_id: fee_template_id || null,
        description: description.trim(),
        amount: Number(amount),
        due_date,
        period_month: period_month || null,
        period_year:  period_year  || null,
        notes: notes || null,
      }));

      const { data, error } = await adminSupabase
        .from("charges")
        .insert(rows)
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data }, { status: 201 });
    }

    // Single charge
    if (!unit_id || !description?.trim() || !amount || !due_date) {
      return NextResponse.json({ error: "שדות חובה חסרים" }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from("charges")
      .insert({
        tenant_id: tenantId,
        unit_id, resident_id: resident_id || null,
        fee_template_id: fee_template_id || null,
        description: description.trim(),
        amount: Number(amount),
        due_date, period_month: period_month || null,
        period_year: period_year || null,
        notes: notes || null,
      })
      .select(`*, units(id, unit_number), residents(id, name)`)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/charges?id=xxx — update status or fields
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
      .from("charges")
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

// DELETE /api/charges?id=xxx
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
      .from("charges")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
