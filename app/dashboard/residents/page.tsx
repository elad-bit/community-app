import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResidentsClient } from "@/components/residents/ResidentsClient";
import type { Resident, Request } from "@/types/index";

export default async function ResidentsPage() {
  const supabase = (await createServerSupabaseClient()) as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Role check
  const { data: roleData } = await supabase.rpc("get_my_resident_role");
  const isAdmin = roleData === "admin";

  // Fetch residents + all requests (for linked-requests panel) in parallel
  const [
    { data: residents, error },
    { data: allRequests },
  ] = await Promise.all([
    supabase
      .from("residents")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("requests")
      .select("id, resident_id, title, status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (error) console.error("Error fetching residents:", error);

  // Show warning if user has no resident profile
  const hasNoProfile = !roleData;

  return (
    <div className="space-y-5">
      {hasNoProfile && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-amber-800">חשבונך אינו מקושר לרשומת תושב</p>
            <p className="text-sm text-amber-700 mt-0.5">
              כדי להפעיל את המערכת, בצע את הצעד הבא ב-Supabase SQL Editor:
            </p>
            <pre className="mt-2 p-3 bg-amber-100 rounded-lg text-xs text-amber-900 overflow-x-auto whitespace-pre-wrap">
{`INSERT INTO public.residents (user_id, name, phone, address, role, balance)
SELECT id, email, '', '', 'admin', 0
FROM auth.users
WHERE email = '${user.email}'
ON CONFLICT DO NOTHING;`}
            </pre>
          </div>
        </div>
      )}

      <ResidentsClient
        initialResidents={(residents as Resident[]) ?? []}
        isAdmin={isAdmin}
        allRequests={(allRequests as Request[]) ?? []}
      />
    </div>
  );
}
