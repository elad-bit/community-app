// Client-side only — fetch-based

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Task, TaskFormData } from "@/types/index";

export async function getTasksClient(): Promise<Task[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, residents(name), requests(title)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as Task[];
}

export async function createTaskClient(
  formData: TaskFormData
): Promise<{ data: Task | null; error: string | null }> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  const json = await res.json();
  if (!res.ok) return { data: null, error: json.error ?? "שגיאה ביצירת משימה" };
  return { data: json.data, error: null };
}

export async function updateTaskClient(
  id: string,
  fields: Partial<TaskFormData>
): Promise<{ error: string | null }> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? "שגיאה בעדכון משימה" };
  return { error: null };
}

export async function deleteTaskClient(
  id: string
): Promise<{ error: string | null }> {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json();
    return { error: json.error ?? "שגיאה במחיקת משימה" };
  }
  return { error: null };
}
