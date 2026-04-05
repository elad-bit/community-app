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

// GET — list all users with their community membership
export async function GET() {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = adminClient();

  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get tenant memberships
  const { data: members } = await supabase
    .from("tenant_members")
    .select("user_id, role, tenant_id, tenants(name, slug)");

  const memberMap = new Map(
    (members || []).map((m) => [m.user_id, m])
  );

  const enriched = (users || []).map((u) => {
    const membership = memberMap.get(u.id);
    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      full_name: u.user_metadata?.full_name,
      avatar_url: u.user_metadata?.avatar_url,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned: u.banned,
      tenant: membership
        ? { id: membership.tenant_id, name: (membership.tenants as { name: string; slug: string })?.name, role: membership.role }
        : null,
    };
  });

  return NextResponse.json({ users: enriched });
}

// PATCH — ban or unban a user
export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, banned } = await req.json();
  const supabase = adminClient();

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876600h" : "none",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
