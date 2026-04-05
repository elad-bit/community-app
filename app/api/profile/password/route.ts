import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/profile/password — שינוי סיסמה
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { password } = await request.json();
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "הסיסמה חייבת להכיל לפחות 8 תווים" }, { status: 400 });
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
