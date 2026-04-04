import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/tenants — יצירת קהילה חדשה
export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { name, slug, city } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "שם הקהילה חובה" }, { status: 400 });
    if (!slug?.trim()) return NextResponse.json({ error: "קוד ייחודי חובה" }, { status: 400 });

    const { data: existing } = await supabase
      .from("tenant_members")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) return NextResponse.json({ error: "כבר שייך לקהילה" }, { status: 409 });

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .insert({ name: name.trim(), slug: slug.trim().toLowerCase(), city: city?.trim() || null })
      .select()
      .single();

    if (tenantErr) {
      if (tenantErr.code === "23505") {
        return NextResponse.json({ error: "הקוד הייחודי כבר תפוס — נסה אחר" }, { status: 409 });
      }
      return NextResponse.json({ error: tenantErr.message }, { status: 500 });
    }

    await supabase.from("tenant_members").insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: "admin",
    });

    await supabase.from("residents").insert({
      tenant_id: tenant.id,
      user_id: user.id,
      name: user.user_metadata?.full_name ?? user.email ?? "מנהל",
      role: "admin",
      balance: 0,
      created_by: user.id,
    });

    return NextResponse.json({ data: tenant }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET /api/tenants
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data, error } = await supabase
      .from("tenant_members")
      .select("role, tenants(id, name, slug, city, logo_url, is_active, created_at)")
      .eq("user_id", user.id)
      .single();

    if (error || !data) return NextResponse.json({ data: null });
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
