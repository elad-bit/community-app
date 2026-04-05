import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ToastProvider } from "@/components/ui/Toast";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = (await createServerSupabaseClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role, tenants(name)")
    .eq("user_id", user.id)
    .single();

  const tenantName = membership?.tenants?.name ?? "ניהול קהילה";

  return (
    <ToastProvider>
      {/* Desktop layout */}
      <div className="flex h-screen bg-secondary-50 overflow-hidden">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden lg:flex flex-shrink-0">
          <Sidebar tenantName={tenantName} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header user={user} tenantName={tenantName} />
          {/* pb-20 leaves room for mobile bottom nav */}
          <main className="flex-1 overflow-auto p-4 lg:p-6 pb-24 lg:pb-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation — shown only on mobile */}
      <div className="lg:hidden">
        <MobileNav tenantName={tenantName} />
      </div>
    </ToastProvider>
  );
}
