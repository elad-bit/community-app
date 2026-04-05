import { cookies } from "next/headers";

const ADMIN_COOKIE  = "admin_session";
const SESSION_TOKEN = process.env.ADMIN_SESSION_SECRET || "community-admin-secret-2025";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return token === SESSION_TOKEN;
}
