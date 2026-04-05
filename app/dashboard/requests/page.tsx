import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RequestsClient } from "@/components/requests/RequestsClient";
import type { Request, Resident, Task } from "@/types/index";

export default async function RequestsPage() {
  const supabase = (await createServerSupabaseClient()) as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Role check
  const { data: roleData } = await supabase.rpc("get_my_resident_role");
  const isAdmin = roleData === "admin";

  // Fetch all data in parallel
  const [
    { data: requests, error: reqError },
    { data: residentsData },
    { data: tasksData },
  ] = await Promise.all([
    // Requests with resident name join
    supabase
      .from("requests")
      .select("*, residents(name)")
      .order("created_at", { ascending: false }),

    // Residents list (for modal dropdown + linked)
    isAdmin
      ? supabase.from("residents").select("id, name, role").order("name")
      : Promise.resolve({ data: [] }),

    // All tasks with resident name (for linked tasks per request)
    supabase
      .from("tasks")
      .select("id, title, status, due_date, request_id, assigned_to, residents(name)")
      .order("created_at", { ascending: false }),
  ]);

  if (reqError) console.error("Error fetching requests:", reqError);

  return (
    <RequestsClient
      initialRequests={(requests as Request[]) ?? []}
      residents={(residentsData as Resident[]) ?? []}
      initialTasks={(tasksData as Task[]) ?? []}
      isAdmin={isAdmin}
    />
  );
}
