import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import type { Request, Task } from "@/types/index";

// ─── Helper ───────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `לפני ${hrs} שעות`;
  const days = Math.floor(hrs / 24);
  return `לפני ${days} ימים`;
}

const REQUEST_LABEL: Record<string, string> = { new: "חדש", in_progress: "בטיפול", closed: "נסגר" };
const TASK_LABEL:    Record<string, string> = { pending: "ממתין", in_progress: "בביצוע", done: "הושלם" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createServerSupabaseClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch in parallel
  const [
    { count: residentsCount },
    { data: openRequests },
    { data: activeTasks },
    { count: closedRequests },
    { count: doneTasks },
  ] = await Promise.all([
    supabase.from("residents").select("id", { count: "exact", head: true }),
    supabase
      .from("requests")
      .select("id, title, status, created_at, residents(name)")
      .in("status", ["new", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, created_at, residents(name)")
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "closed"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "done"),
  ]);

  const openReqs   = (openRequests  as Request[]) ?? [];
  const activeTsks = (activeTasks   as Task[])    ?? [];
  const openCount  = openReqs.length;
  const activeCount = activeTsks.length;

  const stats = [
    { label: "תושבים רשומים", value: residentsCount ?? 0, icon: "👥", color: "text-blue-600",   bg: "bg-blue-50",   href: "/dashboard/residents" },
    { label: "פניות פתוחות",  value: openCount,            icon: "📨", color: "text-amber-600", bg: "bg-amber-50",  href: "/dashboard/requests"  },
    { label: "משימות פעילות", value: activeCount,           icon: "⚡", color: "text-primary-600", bg: "bg-primary-50", href: "/dashboard/tasks"   },
    { label: "טופלו / נסגרו", value: (closedRequests ?? 0) + (doneTasks ?? 0), icon: "✅", color: "text-green-600", bg: "bg-green-50", href: "/dashboard/requests" },
  ];

  const displayName = user?.email?.split("@")[0] ?? "משתמש";

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* ─── Welcome Banner ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-l from-primary-600 to-primary-800 rounded-2xl p-5 lg:p-7 text-white">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold mb-1">
              שלום, {displayName} 👋
            </h1>
            <p className="text-primary-100 text-sm">
              {openCount === 0 && activeCount === 0
                ? "הכל בסדר — אין פניות או משימות פתוחות"
                : `יש ${openCount > 0 ? `${openCount} פניות פתוחות` : ""}${openCount > 0 && activeCount > 0 ? " ו-" : ""}${activeCount > 0 ? `${activeCount} משימות פעילות` : ""}`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/dashboard/requests"
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors rounded-xl px-4 py-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              פנייה חדשה
            </Link>
            <Link
              href="/dashboard/tasks"
              className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors rounded-xl px-4 py-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              משימה חדשה
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Stats Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href}>
            <Card className={`p-4 lg:p-5 hover:shadow-md transition-all cursor-pointer active:scale-95 ${stat.bg} border-0`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
                <span className={`text-2xl lg:text-3xl font-bold ${stat.color}`}>
                  {stat.value}
                </span>
              </div>
              <p className="text-secondary-700 text-xs lg:text-sm font-medium">{stat.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* ─── Two-column: Open Requests + Active Tasks ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Open Requests */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-secondary-100">
            <div className="flex items-center gap-2">
              <span className="text-lg">📨</span>
              <h2 className="font-bold text-secondary-900">פניות פתוחות</h2>
              {openCount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {openCount}
                </span>
              )}
            </div>
            <Link href="/dashboard/requests" className="text-xs text-primary-600 hover:underline font-medium">
              כל הפניות →
            </Link>
          </div>
          <div className="divide-y divide-secondary-50">
            {openReqs.length === 0 ? (
              <div className="py-12 text-center text-secondary-400">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-sm font-medium text-secondary-600">אין פניות פתוחות</p>
              </div>
            ) : (
              openReqs.map(req => (
                <div key={req.id} className="flex items-start gap-3 p-4 hover:bg-secondary-50/50 transition-colors">
                  <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${req.status === "new" ? "bg-blue-500" : "bg-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 truncate">{req.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-secondary-400">{timeAgo(req.created_at)}</span>
                      {req.residents?.name && (
                        <span className="text-xs text-secondary-400">· {req.residents.name}</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    req.status === "new" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {REQUEST_LABEL[req.status]}
                  </span>
                </div>
              ))
            )}
          </div>
          {openCount > 0 && (
            <div className="p-3 border-t border-secondary-100 bg-secondary-50/50">
              <Link
                href="/dashboard/requests"
                className="flex items-center justify-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium py-1"
              >
                צפה בכל הפניות
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            </div>
          )}
        </Card>

        {/* Active Tasks */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-secondary-100">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h2 className="font-bold text-secondary-900">משימות פעילות</h2>
              {activeCount > 0 && (
                <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {activeCount}
                </span>
              )}
            </div>
            <Link href="/dashboard/tasks" className="text-xs text-primary-600 hover:underline font-medium">
              כל המשימות →
            </Link>
          </div>
          <div className="divide-y divide-secondary-50">
            {activeTsks.length === 0 ? (
              <div className="py-12 text-center text-secondary-400">
                <p className="text-3xl mb-2">✨</p>
                <p className="text-sm font-medium text-secondary-600">אין משימות פעילות</p>
              </div>
            ) : (
              activeTsks.map(task => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                return (
                  <div key={task.id} className="flex items-start gap-3 p-4 hover:bg-secondary-50/50 transition-colors">
                    <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${task.status === "in_progress" ? "bg-primary-500" : "bg-secondary-300"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-secondary-400">{timeAgo(task.created_at)}</span>
                        {task.due_date && (
                          <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-secondary-400"}`}>
                            {isOverdue ? "⚠️ " : "📅 "}
                            {new Date(task.due_date).toLocaleDateString("he-IL")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      task.status === "in_progress" ? "bg-primary-100 text-primary-700" : "bg-secondary-100 text-secondary-600"
                    }`}>
                      {TASK_LABEL[task.status]}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {activeCount > 0 && (
            <div className="p-3 border-t border-secondary-100 bg-secondary-50/50">
              <Link
                href="/dashboard/tasks"
                className="flex items-center justify-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium py-1"
              >
                צפה בכל המשימות
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* ─── Quick Actions ────────────────────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="font-bold text-secondary-900 mb-4">פעולות מהירות</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/dashboard/residents", icon: "👤", label: "הוסף תושב",    color: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
            { href: "/dashboard/requests",  icon: "📨", label: "פתח פנייה",    color: "bg-amber-50 hover:bg-amber-100 text-amber-700" },
            { href: "/dashboard/tasks",     icon: "✅", label: "צור משימה",    color: "bg-primary-50 hover:bg-primary-100 text-primary-700" },
            { href: "/dashboard/residents", icon: "📋", label: "רשימת תושבים", color: "bg-secondary-50 hover:bg-secondary-100 text-secondary-700" },
          ].map(action => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${action.color}`}
            >
              <span className="text-3xl">{action.icon}</span>
              <span className="text-xs font-semibold text-center">{action.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
