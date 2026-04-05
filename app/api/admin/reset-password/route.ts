import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// POST — send password reset email to user
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, userId, newPassword } = await req.json();
  const supabase = adminClient();

  // If newPassword provided — set directly
  if (newPassword && userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, method: "direct" });
  }

  // Otherwise send reset email
  if (email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, method: "email" });
  }

  return NextResponse.json({ error: "Missing email or userId+newPassword" }, { status: 400 });
}
