"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Community = {
  id: string;
  name: string;
  slug: string;
  city?: string;
  is_active: boolean;
  created_at: string;
  memberCount: number | null;
  residentCount: number | null;
  requestCount: number | null;
};

type User = {
  id: string;
  email?: string;
  phone?: string;
  full_name?: string;
  created_at: string;
  last_sign_in_at?: string;
  banned: boolean;
  tenant?: { id: string; name: string; role: string } | null;
};

type Tab = "communities" | "users";

export default function AdminDashboardClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("communities");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Reset password modal
  const [resetModal, setResetModal] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCommunities = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/communities");
    const data = await res.json();
    setCommunities(data.tenants || []);
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "communities") loadCommunities();
    else loadUsers();
  }, [tab, loadCommunities, loadUsers]);

  const toggleCommunity = async (id: string, newStatus: boolean) => {
    setActionLoading(id);
    const res = await fetch("/api/admin/communities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: newStatus }),
    });
    const data = await res.json();
    if (data.ok) {
      setCommunities((prev) => prev.map((c) => c.id === id ? { ...c, is_active: newStatus } : c));
      showToast(newStatus ? "קהילה הופעלה" : "קהילה הושהתה");
    } else showToast("שגיאה: " + data.error, "err");
    setActionLoading(null);
  };

  const toggleUser = async (userId: string, banned: boolean) => {
    setActionLoading(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, banned }),
    });
    const data = await res.json();
    if (data.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, banned } : u));
      showToast(banned ? "משתמש חסום" : "חסימת משתמש הוסרה");
    } else showToast("שגיאה: " + data.error, "err");
    setActionLoading(null);
  };

  const handleResetPassword = async () => {
    if (!resetModal || !newPassword || newPassword.length < 6) {
      showToast("סיסמה חייבת להכיל לפחות 6 תווים", "err");
      return;
    }
    setActionLoading("reset");
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: resetModal.id, newPassword }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast("סיסמה אופסה בהצלחה");
      setResetModal(null);
      setNewPassword("");
    } else showToast("שגיאה: " + data.error, "err");
    setActionLoading(null);
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin");
  };

  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("he-IL") : "—";

  return (
    <div className="min-h-screen bg-gray-950 text-white" dir="rtl">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Admin Panel</h1>
            <p className="text-gray-400 text-xs">ניהול קהילה 2.0</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          התנתק
        </button>
      </header>

      {/* Stats bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 grid grid-cols-3 gap-4">
        {[
          { label: "קהילות רשומות", val: communities.length },
          { label: "קהילות פעילות", val: communities.filter((c) => c.is_active).length },
          { label: "משתמשים רשומים", val: users.length },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{s.val}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-6 pt-6 flex gap-2">
        {(["communities", "users"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === t ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {t === "communities" ? "🏘️ קהילות" : "👥 משתמשים"}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="px-6 py-4">
        {loading ? (
          <div className="text-center text-gray-400 py-20">טוען נתונים...</div>
        ) : tab === "communities" ? (
          <CommunitiesTable
            communities={communities}
            actionLoading={actionLoading}
            onToggle={toggleCommunity}
          />
        ) : (
          <UsersTable
            users={users}
            actionLoading={actionLoading}
            onToggle={toggleUser}
            onResetPassword={(u) => { setResetModal(u); setNewPassword(""); }}
          />
        )}
      </main>

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-1">איפוס סיסמה</h3>
            <p className="text-gray-400 text-sm mb-4">{resetModal.email || resetModal.phone}</p>
            <input
              type="password"
              placeholder="סיסמה חדשה (לפחות 6 תווים)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <button
                onClick={handleResetPassword}
                disabled={actionLoading === "reset"}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {actionLoading === "reset" ? "מאפס..." : "אפס סיסמה"}
              </button>
              <button
                onClick={() => setResetModal(null)}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-medium"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-medium shadow-xl z-50 ${
          toast.type === "ok" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Communities Table ─────────────────────────────────────────────────────────

function CommunitiesTable({
  communities, actionLoading, onToggle,
}: {
  communities: Community[];
  actionLoading: string | null;
  onToggle: (id: string, status: boolean) => void;
}) {
  if (!communities.length)
    return <div className="text-center text-gray-400 py-16">אין קהילות רשומות עדיין</div>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-gray-400 text-right">
          <tr>
            {["שם קהילה", "עיר", "מזהה (slug)", "חברים", "תושבים", "פניות", "תאריך הקמה", "סטטוס", "פעולות"].map((h) => (
              <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {communities.map((c, i) => (
            <tr key={c.id} className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-900/30" : ""}`}>
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3 text-gray-400">{c.city || "—"}</td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.slug}</td>
              <td className="px-4 py-3 text-blue-400">{c.memberCount ?? 0}</td>
              <td className="px-4 py-3 text-purple-400">{c.residentCount ?? 0}</td>
              <td className="px-4 py-3 text-yellow-400">{c.requestCount ?? 0}</td>
              <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                {new Date(c.created_at).toLocaleDateString("he-IL")}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  c.is_active ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? "bg-green-400" : "bg-red-400"}`} />
                  {c.is_active ? "פעיל" : "מושהה"}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onToggle(c.id, !c.is_active)}
                  disabled={actionLoading === c.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
                    c.is_active
                      ? "bg-red-900/50 text-red-400 hover:bg-red-900"
                      : "bg-green-900/50 text-green-400 hover:bg-green-900"
                  }`}
                >
                  {actionLoading === c.id ? "..." : c.is_active ? "השהה" : "הפעל"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Users Table ───────────────────────────────────────────────────────────────

function UsersTable({
  users, actionLoading, onToggle, onResetPassword,
}: {
  users: User[];
  actionLoading: string | null;
  onToggle: (userId: string, banned: boolean) => void;
  onResetPassword: (u: User) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
  );

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="חפש לפי אימייל, שם או טלפון..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {!filtered.length ? (
        <div className="text-center text-gray-400 py-16">לא נמצאו משתמשים</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 text-right">
              <tr>
                {["שם / אימייל", "טלפון", "קהילה", "תפקיד", "כניסה אחרונה", "סטטוס", "פעולות"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-900/30" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.full_name || "—"}</div>
                    <div className="text-gray-400 text-xs">{u.email || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.phone || "—"}</td>
                  <td className="px-4 py-3 text-blue-400">{u.tenant?.name || "ללא קהילה"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {u.tenant?.role === "admin" ? "מנהל" : u.tenant?.role === "resident" ? "תושב" : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("he-IL") : "מעולם לא"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      u.banned ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.banned ? "bg-red-400" : "bg-green-400"}`} />
                      {u.banned ? "חסום" : "פעיל"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onResetPassword(u)}
                        className="px-2 py-1.5 bg-blue-900/50 text-blue-400 hover:bg-blue-900 rounded-lg text-xs font-medium transition-colors"
                      >
                        איפוס סיסמה
                      </button>
                      <button
                        onClick={() => onToggle(u.id, !u.banned)}
                        disabled={actionLoading === u.id}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
                          u.banned
                            ? "bg-green-900/50 text-green-400 hover:bg-green-900"
                            : "bg-red-900/50 text-red-400 hover:bg-red-900"
                        }`}
                      >
                        {actionLoading === u.id ? "..." : u.banned ? "בטל חסימה" : "חסום"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
