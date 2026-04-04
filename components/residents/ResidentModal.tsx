"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Resident, ResidentFormData, ResidentRole } from "@/types/index";

interface ResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ResidentFormData) => Promise<void>;
  resident?: Resident | null; // null = הוספה, Resident = עריכה
}

const emptyForm: ResidentFormData = {
  name: "",
  phone: "",
  address: "",
  role: "resident",
  balance: 0,
  user_id: null,
};

export function ResidentModal({
  isOpen,
  onClose,
  onSave,
  resident,
}: ResidentModalProps) {
  const [form, setForm] = useState<ResidentFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // טעינת נתוני תושב בעריכה
  useEffect(() => {
    if (resident) {
      setForm({
        name: resident.name,
        phone: resident.phone ?? "",
        address: resident.address ?? "",
        role: resident.role,
        balance: resident.balance,
        user_id: resident.user_id ?? null,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [resident, isOpen]);

  if (!isOpen) return null;

  const isEdit = !!resident;
  const title = isEdit ? "עריכת תושב" : "הוספת תושב";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("שם הוא שדה חובה");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-secondary-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* שם */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              שם מלא <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ישראל ישראלי"
              required
            />
          </div>

          {/* טלפון */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              טלפון
            </label>
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="050-1234567"
              type="tel"
              dir="ltr"
            />
          </div>

          {/* כתובת */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              כתובת
            </label>
            <Input
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="הרצל 1, תל אביב"
            />
          </div>

          {/* שורה: תפקיד + יתרה */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                תפקיד
              </label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as ResidentRole })
                }
                className="w-full px-3 py-2 border border-secondary-200 rounded-xl text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="resident">תושב</option>
                <option value="admin">מנהל</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                יתרה (₪)
              </label>
              <Input
                value={form.balance}
                onChange={(e) =>
                  setForm({ ...form, balance: parseFloat(e.target.value) || 0 })
                }
                type="number"
                step="0.01"
                dir="ltr"
              />
            </div>
          </div>

          {/* שגיאה */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* כפתורים */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  שומר...
                </span>
              ) : isEdit ? (
                "שמור שינויים"
              ) : (
                "הוסף תושב"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
