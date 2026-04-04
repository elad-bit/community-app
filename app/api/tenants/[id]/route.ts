import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// PATCH /api/tenants/[id] — עדכון פרטי קהילה (מנהל בלבד)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    // וודא שהמשתמש הוא מנהל של הקהילה הזו
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("tenant_id", params.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const body = await request.json();
    const allowed = ["name", "city", "logo_url", "slug"];
    const updates: Record<string, string> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
    }

    // Validate slug uniqueness if changing
    if (updates.slug) {
      const { data: existing } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", updates.slug.toLowerCase())
        .neq("id", params.id)
        .single();
      if (existing) {
        return NextResponse.json({ error: "הכינוי כבר תפוס — נסה אחר" }, { status: 409 });
      }
      updates.slug = updates.slug.toLowerCase();
    }

    const { data, error } = await supabase
      .from("tenants")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
