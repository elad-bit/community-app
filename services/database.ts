import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Member, ActivityItem } from "@/types";

/**
 * קבלת מספר חברים כולל
 */
export async function getMembersCount(): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error fetching members count:", error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * קבלת רשימת חברים עם פגינציה
 */
export async function getMembers(
  page = 1,
  pageSize = 20,
  search?: string
): Promise<{ data: Member[]; total: number }> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("members")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching members:", error.message);
    return { data: [], total: 0 };
  }

  return { data: (data as Member[]) ?? [], total: count ?? 0 };
}

/**
 * קבלת חבר לפי ID
 */
export async function getMemberById(id: string): Promise<Member | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching member:", error.message);
    return null;
  }

  return data as Member;
}

/**
 * הוספת חבר חדש
 */
export async function createMember(
  member: Omit<Member, "id" | "created_at">
): Promise<{ data: Member | null; error: Error | null }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("members")
    .insert(member)
    .select()
    .single();

  return { data: data as Member | null, error };
}

/**
 * עדכון חבר
 */
export async function updateMember(
  id: string,
  updates: Partial<Omit<Member, "id" | "created_at">>
): Promise<{ data: Member | null; error: Error | null }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("members")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return { data: data as Member | null, error };
}

/**
 * מחיקת חבר
 */
export async function deleteMember(id: string): Promise<{ error: Error | null }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("members").delete().eq("id", id);
  return { error };
}

/**
 * קבלת פעילות אחרונה
 */
export async function getRecentActivity(limit = 10): Promise<ActivityItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // table might not exist yet
    return [];
  }

  return (data as ActivityItem[]) ?? [];
}
