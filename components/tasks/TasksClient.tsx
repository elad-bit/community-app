"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TaskModal } from "./TaskModal";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  getTasksClient,
  createTaskClient,
  updateTaskClient,
  deleteTaskClient,
} from "@/services/tasks";
import type { Task, TaskFormData, TaskStatus, Resident, Request } from "@/types/index";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending",     label: "ממתין" },
  { value: "in_progress", label: "בביצוע" },
  { value: "done",        label: "הושלם" },
];

interface TasksClientProps {
  initialTasks: Task[];
  residents: Resident[];
  requests: Request[];
  isAdmin: boolean;
}

export function TasksClient({ initialTasks, residents, requests, isAdmin }: TasksClientProps) {
  const toast = useToast();

  const [tasks, setTasks]               = useState<Task[]>(initialTasks);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [modalOpen, setModalOpen]       = useState(false);
  const [editing, setEditing]           = useState<Task | null>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const refresh = useCallback(async () => {
    try { setTasks(await getTasksClient()); } catch { /* silent */ }
  }, []);

  const handleSave = async (formData: TaskFormData) => {
    if (editing) {
      const res = await fetch(`/api/tasks/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTasks(prev => prev.map(t => t.id === editing.id ? json.data : t));
      toast.success("המשימה עודכנה בהצלחה");
    } else {
      const { data, error } = await createTaskClient(formData);
      if (error) throw new Error(error);
      setTasks(prev => [data as Task, ...prev]);
      toast.success("המשימה נוצרה בהצלחה");
    }
    await refresh();
  };

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    const { error } = await updateTaskClient(id, { status });
    if (error) { toast.error(error); return; }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    toast.success("הסטטוס עודכן");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    const { error } = await deleteTaskClient(deleteId);
    setDeleteLoading(false);
    if (error) toast.error(error);
    else {
      setTasks(prev => prev.filter(t => t.id !== deleteId));
      toast.success("המשימה נמחקה");
    }
    setDeleteId(null);
  };

  const filtered = tasks.filter(t => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.residents?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.requests?.title ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Stats counters
  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    done: tasks.filter(t => t.status === "done").length,
  };

  function formatDueDate(date: string | null | undefined) {
    if (!date) return null;
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = d < today;
    const label = d.toLocaleDateString("he-IL");
    return { label, isOverdue };
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">משימות</h1>
          <p className="text-sm text-secondary-500 mt-0.5">{tasks.length} משימות סה&quot;כ</p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={() => { setEditing(null); setModalOpen(true); }} className="shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            משימה חדשה
          </Button>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: "all",         label: "הכל",     color: "text-secondary-700 bg-secondary-50" },
          { key: "pending",     label: "ממתין",   color: "text-secondary-600 bg-secondary-100" },
          { key: "in_progress", label: "בביצוע",  color: "text-amber-700 bg-amber-50" },
          { key: "done",        label: "הושלם",   color: "text-green-700 bg-green-50" },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key as TaskStatus | "all")}
            className={`rounded-xl p-3 text-center transition-all border-2 ${
              filterStatus === key ? "border-primary-400 shadow-sm" : "border-transparent"
            } ${color}`}
          >
            <p className="text-xl font-bold">{counts[key as keyof typeof counts]}</p>
            <p className="text-xs font-medium mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש משימה..."
            className="w-full pr-10 pl-4 py-2 border border-secondary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </Card>

      {/* Task list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="py-16 text-center text-secondary-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-base font-medium text-secondary-600">
              {search || filterStatus !== "all" ? "לא נמצאו משימות תואמות" : "אין משימות עדיין"}
            </p>
            {!search && filterStatus === "all" && isAdmin && (
              <p className="text-sm mt-1">לחץ &quot;משימה חדשה&quot; להתחלה</p>
            )}
          </Card>
        ) : (
          filtered.map(task => {
            const due = formatDueDate(task.due_date);
            return (
              <Card key={task.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Top meta row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <TaskStatusBadge status={task.status} />
                      {task.residents?.name && (
                        <span className="text-xs text-secondary-400">👤 {task.residents.name}</span>
                      )}
                      {task.requests?.title && (
                        <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                          🔗 {task.requests.title}
                        </span>
                      )}
                      {due && (
                        <span className={`text-xs mr-auto ${due.isOverdue ? "text-red-600 font-medium" : "text-secondary-400"}`}>
                          {due.isOverdue ? "⚠️ " : "📅 "}{due.label}
                        </span>
                      )}
                      {!due && (
                        <span className="text-xs text-secondary-400 mr-auto">
                          {new Date(task.created_at).toLocaleDateString("he-IL")}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-secondary-900 truncate">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-secondary-500 mt-1 line-clamp-2">{task.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin && (
                      <select
                        value={task.status}
                        onChange={e => handleStatusChange(task.id, e.target.value as TaskStatus)}
                        className="text-xs border border-secondary-200 rounded-lg px-2 py-1.5 bg-white text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => { setEditing(task); setModalOpen(true); }}
                          className="p-1.5 rounded-lg text-secondary-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          title="עריכה"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteId(task.id)}
                          className="p-1.5 rounded-lg text-secondary-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="מחיקה"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal */}
      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        task={editing}
        residents={residents}
        requests={requests}
      />

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 z-10 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-secondary-900 mb-1">מחיקת משימה</h3>
            <p className="text-sm text-secondary-500 mb-5">פעולה זו אינה ניתנת לביטול</p>
            <div className="flex gap-3">
              <Button variant="danger" className="flex-1" onClick={handleDelete} isLoading={deleteLoading}>מחק</Button>
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)} disabled={deleteLoading}>ביטול</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
