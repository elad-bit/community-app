"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Task, TaskFormData, TaskStatus, Resident, Request } from "@/types/index";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TaskFormData) => Promise<void>;
  task?: Task | null;
  residents?: Resident[];
  requests?: Request[];
  defaultRequestId?: string | null;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending",     label: "ממתין" },
  { value: "in_progress", label: "בביצוע" },
  { value: "done",        label: "הושלם" },
];

const empty: TaskFormData = {
  title: "",
  description: "",
  assigned_to: null,
  request_id: null,
  status: "pending",
  due_date: null,
};

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  residents = [],
  requests = [],
  defaultRequestId = null,
}: TaskModalProps) {
  const [form, setForm] = useState<TaskFormData>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        assigned_to: task.assigned_to ?? null,
        request_id: task.request_id ?? null,
        status: task.status,
        due_date: task.due_date ?? null,
      });
    } else {
      setForm({ ...empty, request_id: defaultRequestId });
    }
    setError(null);
  }, [task, isOpen, defaultRequestId]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("כותרת היא שדה חובה"); return; }
    setLoading(true); setError(null);
    try { await onSave(form); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "שגיאה"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-secondary-900">{task ? "עריכת משימה" : "משימה חדשה"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-secondary-400 hover:bg-secondary-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              כותרת <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="תיאור קצר של המשימה"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">פירוט</label>
            <textarea
              value={form.description ?? ""}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="הוסף פרטים נוספים..."
              rows={3}
              className="w-full px-3 py-2 border border-secondary-200 rounded-xl text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Status + Due date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">סטטוס</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })}
                className="w-full px-3 py-2 border border-secondary-200 rounded-xl text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">תאריך יעד</label>
              <input
                type="date"
                value={form.due_date ?? ""}
                onChange={e => setForm({ ...form, due_date: e.target.value || null })}
                className="w-full px-3 py-2 border border-secondary-200 rounded-xl text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>
          </div>

          {/* Assigned to */}
          {residents.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">מוקצה לתושב</label>
              <select
                value={form.assigned_to ?? ""}
                onChange={e => setForm({ ...form, assigned_to: e.target.value || null })}
                className="w-full px-3 py-2 border border-secondary-200 rounded-xl text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">— ללא שיוך —</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Linked request */}
          {requests.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">פנייה מקושרת</label>
              <select
                value={form.request_id ?? ""}
                onChange={e => setForm({ ...form, request_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-secondary-200 rounded-xl text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">— ללא קישור לפנייה —</option>
                {requests.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" isLoading={loading}>
              {task ? "שמור שינויים" : "צור משימה"}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
