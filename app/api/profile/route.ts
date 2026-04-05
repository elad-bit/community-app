import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// PATCH /api/profile — עדכון שם + תמונה של המשתמש הנוכחי
export async function PATCH(request: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { name, avatar_url } = await request.json();
    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: "שם לא יכול להיות ריק" }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (name)       updates.name       = name.trim();
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    // Update residents table row for this user
    const { data, error } = await supabase
      .from("residents")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Also update Supabase auth user_metadata so name shows in auth
    if (name) {
      await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET /api/profile — פרטי הפרופיל הנוכחי
export async function GET() {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: resident, error } = await supabase
      .from("residents")
      .select("id, name, phone, address, role, balance, avatar_url, created_at")
      .eq("user_id", user.id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data: {
        ...resident,
        email: user.email,
        auth_provider: user.app_metadata?.provider ?? "email",
      }
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
