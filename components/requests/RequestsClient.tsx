"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RequestModal } from "./RequestModal";
import { RequestStatusBadge } from "./StatusBadge";
import { TaskModal } from "@/components/tasks/TaskModal";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  getRequestsClient,
  createRequestClient,
  updateRequestStatusClient,
  deleteRequestClient,
} from "@/services/requests";
import { createTaskClient } from "@/services/tasks";
import type {
  Request, RequestFormData, RequestStatus,
  Task, TaskFormData,
  Resident,
} from "@/types/index";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "new",         label: "חדש" },
  { value: "in_progress", label: "בטיפול" },
  { value: "closed",      label: "נסגר" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface RequestsClientProps {
  initialRequests: Request[];
  residents: Resident[];
  isAdmin: boolean;
  initialTasks?: Task[];     // all tasks — used for linked tasks per request
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RequestsClient({
  initialRequests,
  residents,
  isAdmin,
  initialTasks = [],
}: RequestsClientProps) {
  const toast = useToast();

  const [requests, setRequests]             = useState<Request[]>(initialRequests);
  const [allTasks, setAllTasks]             = useState<Task[]>(initialTasks);
  const [search, setSearch]                 = useState("");
  const [filterStatus, setFilterStatus]     = useState<RequestStatus | "all">("all");
  const [modalOpen, setModalOpen]           = useState(false);
  const [editing, setEditing]               = useState<Request | null>(null);
  const [deleteId, setDeleteId]             = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen]   = useState(false);
  const [taskForRequest, setTaskForRequest] = useState<string | null>(null);

  // ─── Data refresh ─────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      setRequests(await getRequestsClient());
    } catch { /* silent */ }
  }, []);

  // ─── Request CRUD ─────────────────────────────────────────────────────────

  const handleSaveRequest = async (formData: RequestFormData) => {
    if (editing) {
      const res = await fetch(`/api/requests/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "שגיאה בעדכון");
      setRequests(prev => prev.map(r => r.id === editing.id ? json.data : r));
      toast.success("הפנייה עודכנה בהצלחה");
    } else {
      const { data, error } = await createRequestClient(formData);
      if (error) throw new Error(error);
      setRequests(prev => [data as Request, ...prev]);
      toast.success("הפנייה נפתחה בהצלחה");
    }
    await refresh();
  };

  const handleStatusChange = async (id: string, status: RequestStatus) => {
    const { error } = await updateRequestStatusClient(id, status);
    if (error) { toast.error(error); return; }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast.success("הסטטוס עודכן");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    const { error } = await deleteRequestClient(deleteId);
    setDeleteLoading(false);
    if (error) { toast.error(error); }
    else {
      setRequests(prev => prev.filter(r => r.id !== deleteId));
      toast.success("הפנייה נמחקה");
    }
    setDeleteId(null);
  };

  // ─── Task creation from request ───────────────────────────────────────────

  const handleSaveTask = async (formData: TaskFormData) => {
    const { data, error } = await createTaskClient(formData);
    if (error) throw new Error(error);
    setAllTasks(prev => [data as Task, ...prev]);
    toast.success("המשימה נוצרה בהצלחה");
  };

  // ─── Filter ───────────────────────────────────────────────────────────────

  const filtered = requests.filter(r => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.residents?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    all:         requests.length,
    new:         requests.filter(r => r.status === "new").length,
    in_progress: requests.filter(r => r.status === "in_progress").length,
    closed:      requests.filter(r => r.status === "closed").length,
  };

  const linkedTasks = (reqId: string) => allTasks.filter(t => t.request_id === reqId);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-3xl mx-auto lg:max-w-none">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">פניות</h1>
          <p className="text-sm text-secondary-500 mt-0.5">{requests.length} פניות סה&quot;כ</p>
        </div>
        <Button
          size="lg"
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          פתח פנייה
        </Button>
      </div>

      {/* Status tabs + search */}
      <Card className="p-3 lg:p-4 space-y-3">
        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {([
            { value: "all",         label: "הכל",    count: counts.all },
            { value: "new",         label: "חדש",    count: counts.new },
            { value: "in_progress", label: "בטיפול", count: counts.in_progress },
            { value: "closed",      label: "נסגר",   count: counts.closed },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                filterStatus === opt.value
                  ? "bg-primary-100 text-primary-700"
                  : "text-secondary-500 hover:bg-secondary-100"
              }`}
            >
              {opt.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filterStatus === opt.value ? "bg-primary-200 text-primary-700" : "bg-secondary-100 text-secondary-500"
              }`}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש פנייה, תיאור, שם תושב..."
            className="w-full pr-10 pl-4 py-2.5 border border-secondary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-base font-medium text-secondary-600">
              {search || filterStatus !== "all" ? "לא נמצאו פניות תואמות" : "אין פניות עדיין"}
            </p>
            {!search && filterStatus === "all" && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-3 text-sm text-primary-600 hover:underline font-medium"
              >
                פתח פנייה ראשונה →
              </button>
            )}
          </Card>
        ) : (
          filtered.map(req => {
            const tasks = linkedTasks(req.id);
            const isExpanded = expandedId === req.id;

            return (
              <Card key={req.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Main row */}
                <div className="p-4 lg:p-5">
                  <div className="flex items-start gap-3">
                    {/* Left: content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <RequestStatusBadge status={req.status} />
                        {req.residents?.name && (
                          <span className="text-xs bg-secondary-100 text-secondary-600 px-2 py-0.5 rounded-full">
                            👤 {req.residents.name}
                          </span>
                        )}
                        <span className="text-xs text-secondary-400 mr-auto">
                          {new Date(req.created_at).toLocaleDateString("he-IL")}
                        </span>
                      </div>
                      <h3 className="font-semibold text-secondary-900 leading-snug">{req.title}</h3>
                      {req.description && (
                        <p className="text-sm text-secondary-500 mt-1 line-clamp-2">{req.description}</p>
                      )}
                    </div>

                    {/* Right: actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <select
                          value={req.status}
                          onChange={e => handleStatusChange(req.id, e.target.value as RequestStatus)}
                          className="hidden sm:block text-xs border border-secondary-200 rounded-lg px-2 py-1.5 bg-white text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => { setEditing(req); setModalOpen(true); }}
                          className="p-2 rounded-lg text-secondary-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                          title="עריכה"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteId(req.id)}
                          className="p-2 rounded-lg text-secondary-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="מחיקה"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bottom action bar */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-secondary-50">
                    {/* Mobile status select */}
                    {isAdmin && (
                      <select
                        value={req.status}
                        onChange={e => handleStatusChange(req.id, e.target.value as RequestStatus)}
                        className="sm:hidden text-xs border border-secondary-200 rounded-lg px-2 py-1.5 bg-white text-secondary-700 focus:outline-none"
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    )}

                    {/* Expand linked tasks */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="flex items-center gap-1.5 text-xs text-secondary-500 hover:text-primary-600 transition-colors"
                    >
                      <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      {tasks.length > 0 ? `${tasks.length} משימות` : "משימות"}
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => { setTaskForRequest(req.id); setTaskModalOpen(true); }}
                        className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors mr-auto"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        צור משימה
                      </button>
                    )}
                  </div>
                </div>

                {/* Linked tasks panel */}
                {isExpanded && (
                  <div className="border-t border-secondary-100 bg-secondary-50/60 px-4 lg:px-5 py-3 space-y-2">
                    {tasks.length === 0 ? (
                      <p className="text-xs text-secondary-400 py-2 text-center">
                        אין משימות מקושרות לפנייה זו
                        {isAdmin && (
                          <button
                            onClick={() => { setTaskForRequest(req.id); setTaskModalOpen(true); }}
                            className="text-primary-600 hover:underline mr-1"
                          >
                            — צור אחת
                          </button>
                        )}
                      </p>
                    ) : (
                      tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm">
                          <TaskStatusBadge status={task.status} />
                          <span className="text-sm font-medium text-secondary-800 flex-1 truncate">{task.title}</span>
                          {task.residents?.name && (
                            <span className="text-xs text-secondary-400 flex-shrink-0">👤 {task.residents.name}</span>
                          )}
                          {task.due_date && (
                            <span className={`text-xs flex-shrink-0 ${new Date(task.due_date) < new Date() ? "text-red-500" : "text-secondary-400"}`}>
                              📅 {new Date(task.due_date).toLocaleDateString("he-IL")}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Request Modal */}
      <RequestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveRequest}
        request={editing}
        residents={residents}
        isAdmin={isAdmin}
      />

      {/* Task Modal (created from request) */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setTaskForRequest(null); }}
        onSave={handleSaveTask}
        residents={residents}
        defaultRequestId={taskForRequest}
      />

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-secondary-900 mb-1">מחיקת פנייה</h3>
            <p className="text-sm text-secondary-500 mb-6">פעולה זו תמחק גם את כל המשימות המקושרות</p>
            <div className="flex gap-3">
              <Button variant="danger" className="flex-1" size="lg" onClick={handleDelete} isLoading={deleteLoading}>מחק</Button>
              <Button variant="outline" className="flex-1" size="lg" onClick={() => setDeleteId(null)} disabled={deleteLoading}>ביטול</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
