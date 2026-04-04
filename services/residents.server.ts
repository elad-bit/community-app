// ============================================================
// Server-side only — נטען ב-Server Components ו-API Routes בלבד
// ============================================================

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Resident, ResidentFormData } from "@/types/index";

export async function getResidents(): Promise<Resident[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("residents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Resident[];
}

export async function getResidentById(id: string): Promise<Resident | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("residents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Resident;
}

export async function getCurrentUserRole(): Promise<"admin" | "resident" | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.rpc("get_my_resident_role");
  return (data as "admin" | "resident" | null) ?? null;
}

export async function createResident(
  formData: ResidentFormData,
  createdBy: string
): Promise<Resident> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("residents")
    .insert({ ...formData, created_by: createdBy })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Resident;
}

export async function updateResident(
  id: string,
  formData: Partial<ResidentFormData>
): Promise<Resident> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("residents")
    .update(formData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Resident;
}

export async function deleteResident(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("residents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
