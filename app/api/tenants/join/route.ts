import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/tenants/join — הצטרפות לקהילה קיימת לפי slug
export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { slug } = await request.json();
    if (!slug?.trim()) return NextResponse.json({ error: "קוד קהילה חסר" }, { status: 400 });

    const { data: existing } = await supabase
      .from("tenant_members")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) return NextResponse.json({ error: "כבר שייך לקהילה" }, { status: 409 });

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, name, is_active")
      .eq("slug", slug.trim().toLowerCase())
      .single();

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: "קהילה לא נמצאה — בדוק את הקוד ונסה שוב" }, { status: 404 });
    }

    if (!tenant.is_active) {
      return NextResponse.json({ error: "הקהילה אינה פעילה" }, { status: 403 });
    }

    await supabase.from("tenant_members").insert({
      tenant_id: tenant.id,
      user_id: user.id,
      role: "resident",
    });

    await supabase.from("residents").insert({
      tenant_id: tenant.id,
      user_id: user.id,
      name: user.user_metadata?.full_name ?? user.email ?? "תושב",
      role: "resident",
      balance: 0,
      created_by: user.id,
    });

    return NextResponse.json({ data: { tenantName: tenant.name } });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
