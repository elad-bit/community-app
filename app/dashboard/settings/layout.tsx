"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const tabs = [
  { href: "/dashboard/settings/profile",      icon: "👤", label: "פרופיל" },
  { href: "/dashboard/settings/community",     icon: "🏘️", label: "קהילה" },
  { href: "/dashboard/settings/invite",        icon: "📨", label: "הזמנות" },
  { href: "/dashboard/settings/integrations",  icon: "🔌", label: "חיבורים" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">הגדרות</h1>
        <p className="text-sm text-secondary-500 mt-0.5">ניהול קהילה, פרופיל וחיבורים חיצוניים</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-secondary-100 rounded-2xl p-1 overflow-x-auto">
        {tabs.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap flex-1 justify-center transition-all",
                isActive
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-secondary-500 hover:text-secondary-800"
              )}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
