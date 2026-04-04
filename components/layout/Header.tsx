"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/services/auth";

interface HeaderProps {
  user: User;
  tenantName?: string;
}

export function Header({ user, tenantName }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const initials = user.email
    ? user.email.slice(0, 2).toUpperCase()
    : "??";

  return (
    <header className="h-16 bg-white border-b border-secondary-100 flex items-center justify-between px-6 flex-shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            placeholder="חיפוש..."
            className="w-full pr-10 pl-4 py-2 text-sm rounded-xl border border-secondary-200 bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* שם הקהילה */}
      {tenantName && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-xl">
          <span className="text-xs text-primary-500">🏘️</span>
          <span className="text-sm font-medium text-primary-700">{tenantName}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mr-4">
        {/* Notifications */}
        <button className="relative p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-xl transition-colors">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-secondary-100 rounded-xl transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
              {initials}
            </div>
            <span className="text-sm font-medium text-secondary-700 hidden sm:block">
              {user.email?.split("@")[0]}
            </span>
            <svg
              className="h-4 w-4 text-secondary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-secondary-100 py-1 z-50">
              <div className="px-4 py-2 border-b border-secondary-100">
                <p className="text-xs text-secondary-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                התנתקות
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
