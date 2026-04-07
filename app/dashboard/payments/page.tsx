import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaymentsClient } from "@/components/payments/PaymentsClient";

export default async function PaymentsPage() {
  const supabase = (await createServerSupabaseClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: role } = await supabase.rpc("get_my_resident_role");
  if (!role) redirect("/dashboard");

  const canManage = ["admin", "chairman"].includes(role);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">דיירים ותשלומים</h1>
          <p className="text-sm text-secondary-500 mt-1">ניהול דירות, חיובים ותשלומי ועד</p>
        </div>
      </div>
      <PaymentsClient canManage={canManage} />
    </div>
  );
}
