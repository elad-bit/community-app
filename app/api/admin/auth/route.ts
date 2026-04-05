import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin@admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456789";
const ADMIN_COOKIE   = "admin_session";
const SESSION_TOKEN  = process.env.ADMIN_SESSION_SECRET || "community-admin-secret-2025";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, SESSION_TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "שם משתמש או סיסמה שגויים" }, { status: 401 });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
