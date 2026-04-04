"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Request, RequestFormData, Resident } from "@/types/index";

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RequestFormData) => Promise<void>;
  request?: Request | null;
  residents?: Resident[];
  isAdmin: boolean;
}

const empty: RequestFormData = { title: "", description: "", resident_id: null };

export function RequestModal({ isOpen, onClose, onSave, request, residents = [], isAdmin }: RequestModalProps) {
  const [form, setForm] = useState<RequestFormData>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (request) {
      setForm({ title: request.title, description: request.description ?? "", resident_id: request.resident_id ?? null });
    } else {
      setForm(empty);
    }
    setError(null);
  }, [request, isOpen]);

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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-secondary-900">{request ? "עריכת פנייה" : "פתיחת פנייה חדשה"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-secondary-400 hover:bg-secondary-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">כותרת <span className="text-red-500">*</span></label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="תיאור קצר של הפנייה" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">פירוט</label>
            <textarea
              value={form.description ?? ""}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="תאר את הבעיה או הבקשה בפירוט..."
              rows={4}
              className="w-full px-3 py-2 border border-secondary-200 rounded-xl text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {isAdmin && residents.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">תושב מגיש</label>
              <select
                value={form.resident_id ?? ""}
                onChange={e => setForm({ ...form, resident_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-secondary-200 rounded-xl text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">— ללא שיוך —</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" isLoading={loading}>
              {request ? "שמור שינויים" : "פתח פנייה"}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>ביטול</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
