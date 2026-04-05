import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  const ok = await isAdminAuthenticated();
  if (!ok) redirect("/admin");

  return <AdminDashboardClient />;
}
