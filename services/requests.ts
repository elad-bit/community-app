"use client-safe";
// Client-side only — fetch-based

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Request, RequestFormData } from "@/types/index";

export async function getRequestsClient(): Promise<Request[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*, residents(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as Request[];
}

export async function createRequestClient(
  formData: RequestFormData
): Promise<{ data: Request | null; error: string | null }> {
  const res = await fetch("/api/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  const json = await res.json();
  if (!res.ok) return { data: null, error: json.error ?? "שגיאה בפתיחת פנייה" };
  return { data: json.data, error: null };
}

export async function updateRequestStatusClient(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const res = await fetch(`/api/requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? "שגיאה בעדכון סטטוס" };
  return { error: null };
}

export async function deleteRequestClient(
  id: string
): Promise<{ error: string | null }> {
  const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json();
    return { error: json.error ?? "שגיאה במחיקת פנייה" };
  }
  return { error: null };
}
