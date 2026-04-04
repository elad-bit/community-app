import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileSettingsClient } from "@/components/settings/ProfileSettingsClient";

export default async function ProfileSettingsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createServerSupabaseClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: resident } = await supabase
    .from("residents")
    .select("id, name, phone, address, role, avatar_url")
    .eq("user_id", user.id)
    .single();

  const authProvider = user.app_metadata?.provider ?? "email";

  return (
    <ProfileSettingsClient
      resident={resident}
      email={user.email ?? ""}
      authProvider={authProvider}
    />
  );
}
