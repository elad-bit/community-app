import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel — ניהול קהילה 2.0",
  robots: "noindex,nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
