import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TasksClient } from "@/components/tasks/TasksClient";
import type { Task, Resident, Request } from "@/types/index";

export default async function TasksPage() {
  const supabase = (await createServerSupabaseClient()) as any; // eslint-disable-line

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Role check
  const { data: roleData } = await supabase.rpc("get_my_resident_role");
  const isAdmin = roleData === "admin";

  // Fetch tasks with resident name and linked request title
  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("*, residents(name), requests(title)")
    .order("created_at", { ascending: false });

  if (taskError) console.error("Error fetching tasks:", taskError);

  // Fetch residents for assignment dropdown (admin)
  let residents: Resident[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("residents")
      .select("id, name, role")
      .order("name", { ascending: true });
    residents = (data as Resident[]) ?? [];
  }

  // Fetch open requests for linking (admin)
  let requests: Request[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("requests")
      .select("id, title, status")
      .neq("status", "closed")
      .order("created_at", { ascending: false });
    requests = (data as Request[]) ?? [];
  }

  return (
    <TasksClient
      initialTasks={(tasks as Task[]) ?? []}
      residents={residents}
      requests={requests}
      isAdmin={isAdmin}
    />
  );
}
