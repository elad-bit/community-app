import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

// GET /api/payments?charge_id=&unit_id=
export async function GET(req: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    if (!tenantId) return NextResponse.json({ error: "לא נמצא טנאנט" }, { status: 400 });

    const chargeId = req.nextUrl.searchParams.get("charge_id");
    const unitId   = req.nextUrl.searchParams.get("unit_id");

    const adminSupabase = createServerSupabaseAdminClient();
    let query = adminSupabase
      .from("payments")
      .select(`*, units(id, unit_number), residents(id, name), charges(id, description, amount)`)
      .eq("tenant_id", tenantId)
      .order("payment_date", { ascending: false });

    if (chargeId) query = query.eq("charge_id", chargeId);
    if (unitId)   query = query.eq("unit_id", unitId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/payments — record a payment
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
    const { charge_id, unit_id, resident_id, amount, payment_date, method, reference, notes } = body;

    if (!charge_id || !unit_id || !amount) {
      return NextResponse.json({ error: "שדות חובה חסרים" }, { status: 400 });
    }

    const adminSupabase = createServerSupabaseAdminClient();

    // Insert the payment
    const { data: payment, error: payErr } = await adminSupabase
      .from("payments")
      .insert({
        tenant_id:    tenantId,
        charge_id,
        unit_id,
        resident_id:  resident_id || null,
        amount:       Number(amount),
        payment_date: payment_date || new Date().toISOString().split("T")[0],
        method:       method || "bank_transfer",
        reference:    reference || null,
        notes:        notes || null,
        created_by:   user.id,
      })
      .select()
      .single();

    if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });

    // Auto-update charge status based on total payments
    const { data: charge } = await adminSupabase
      .from("charges")
      .select("amount, payments(amount)")
      .eq("id", charge_id)
      .single();

    if (charge) {
      const totalPaid = (charge.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const chargeAmount = Number(charge.amount);
      let newStatus = "partial";
      if (totalPaid >= chargeAmount) newStatus = "paid";
      else if (totalPaid === 0)      newStatus = "pending";

      await adminSupabase
        .from("charges")
        .update({ status: newStatus })
        .eq("id", charge_id);
    }

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/payments?id=xxx
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

    // Get the payment to know its charge_id for status recalc
    const { data: payment } = await adminSupabase
      .from("payments")
      .select("charge_id")
      .eq("id", id)
      .single();

    const { error } = await adminSupabase
      .from("payments")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Recalculate charge status after deletion
    if (payment?.charge_id) {
      const { data: charge } = await adminSupabase
        .from("charges")
        .select("amount, payments(amount)")
        .eq("id", payment.charge_id)
        .single();

      if (charge) {
        const totalPaid = (charge.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
        const chargeAmount = Number(charge.amount);
        let newStatus = totalPaid >= chargeAmount ? "paid" : totalPaid > 0 ? "partial" : "pending";
        await adminSupabase
          .from("charges")
          .update({ status: newStatus })
          .eq("id", payment.charge_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
