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

// GET — list all communities with stats
export async function GET() {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = adminClient();

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich each tenant with member count
  const enriched = await Promise.all(
    (tenants || []).map(async (t) => {
      const { count: memberCount } = await supabase
        .from("tenant_members")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", t.id);
      const { count: residentCount } = await supabase
        .from("residents")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", t.id);
      const { count: requestCount } = await supabase
        .from("requests")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", t.id);
      return { ...t, memberCount, residentCount, requestCount };
    })
  );

  return NextResponse.json({ tenants: enriched });
}

// PATCH — toggle is_active for a community
export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, is_active } = await req.json();
  const supabase = adminClient();

  const { error } = await supabase
    .from("tenants")
    .update({ is_active })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — delete a community
export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  const supabase = adminClient();

  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
