// ============================================================
// Client-side only — נטען ב-Client Components בלבד
// ============================================================

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Resident, ResidentFormData } from "@/types/index";

export async function getResidentsClient(): Promise<Resident[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("residents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Resident[];
}

export async function createResidentClient(
  formData: ResidentFormData
): Promise<{ data: Resident | null; error: string | null }> {
  const res = await fetch("/api/residents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  const json = await res.json();
  if (!res.ok) return { data: null, error: json.error ?? "שגיאה ביצירת תושב" };
  return { data: json.data, error: null };
}

export async function updateResidentClient(
  id: string,
  formData: Partial<ResidentFormData>
): Promise<{ data: Resident | null; error: string | null }> {
  const res = await fetch(`/api/residents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  const json = await res.json();
  if (!res.ok) return { data: null, error: json.error ?? "שגיאה בעדכון תושב" };
  return { data: json.data, error: null };
}

export async function deleteResidentClient(
  id: string
): Promise<{ error: string | null }> {
  const res = await fetch(`/api/residents/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json();
    return { error: json.error ?? "שגיאה במחיקת תושב" };
  }
  return { error: null };
}
