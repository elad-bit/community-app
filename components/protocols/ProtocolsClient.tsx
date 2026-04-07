"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Protocol, ProtocolType } from "@/types/index";

const TYPE_LABELS: Record<ProtocolType, string> = {
  committee: "ועד",
  general_assembly: "אסיפה כללית",
  association: "אגודה",
};

const TYPE_COLORS: Record<ProtocolType, string> = {
  committee: "bg-blue-100 text-blue-800",
  general_assembly: "bg-green-100 text-green-800",
  association: "bg-purple-100 text-purple-800",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "טיוטה",
  processing: "מעבד...",
  ready: "מוכן לסקירה",
  approved: "מאושר",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  processing: "bg-yellow-100 text-yellow-700",
  ready: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
};

interface ProtocolsClientProps {
  protocols: Protocol[];
  canManage: boolean;
}

export function ProtocolsClient({ protocols, canManage }: ProtocolsClientProps) {
  const router = useRouter();
  const [showNewModal, setShowNewModal] = useState(false);
  const [filterType, setFilterType] = useState<ProtocolType | "all">("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [searchQ, setSearchQ] = useState("");

  const years = Array.from(
    new Set(protocols.map((p) => new Date(p.meeting_date).getFullYear()))
  ).sort((a, b) => b - a);

  const filtered = protocols.filter((p) => {
    if (filterType !== "all" && p.protocol_type !== filterType) return false;
    if (filterYear !== "all" && String(new Date(p.meeting_date).getFullYear()) !== filterYear) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.association_name?.toLowerCase().includes(q) ||
        p.chairman_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const signatureCount = (p: Protocol) => (p.signatures as any[])?.length ?? 0;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-secondary-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-secondary-900">פרוטוקולים</h1>
          <p className="text-sm text-secondary-500 mt-0.5">
            {filtered.length} פרוטוקולים
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            פרוטוקול חדש
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-secondary-100 px-6 py-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="חיפוש..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="flex-1 min-w-[180px] max-w-xs text-sm border border-secondary-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ProtocolType | "all")}
          className="text-sm border border-secondary-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="all">כל הסוגים</option>
          <option value="committee">ועד</option>
          <option value="general_assembly">אסיפה כללית</option>
          <option value="association">אגודה</option>
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="text-sm border border-secondary-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="all">כל השנים</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-secondary-400">
            <svg className="h-12 w-12 mb-3 text-secondary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-medium">אין פרוטוקולים</p>
            {canManage && (
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-3 text-sm text-primary-600 hover:underline"
              >
                הוסף פרוטוקול ראשון
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((protocol) => {
              const sigCount = signatureCount(protocol);
              const decisionsCount = (protocol as any).protocol_decisions?.[0]?.count ?? 0;

              return (
                <div
                  key={protocol.id}
                  onClick={() => router.push(`/dashboard/protocols/${protocol.id}`)}
                  className="bg-white rounded-xl border border-secondary-100 p-4 hover:border-primary-200 hover:shadow-sm cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[protocol.protocol_type]}`}>
                          {TYPE_LABELS[protocol.protocol_type]}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[protocol.status]}`}>
                          {STATUS_LABELS[protocol.status]}
                        </span>
                        {protocol.meeting_number && (
                          <span className="text-xs text-secondary-400">ישיבה #{protocol.meeting_number}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-secondary-900 group-hover:text-primary-700 truncate">
                        {protocol.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-secondary-500">
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(protocol.meeting_date)}
                        </span>
                        {protocol.association_name && (
                          <span>{protocol.association_name}</span>
                        )}
                        {(protocol.participants as string[])?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {(protocol.participants as string[]).length} משתתפים
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {/* Decisions badge */}
                      {decisionsCount > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          {decisionsCount} החלטות
                        </span>
                      )}
                      {/* Signature dots */}
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className={`h-2 w-2 rounded-full ${i < sigCount ? "bg-green-400" : "bg-gray-200"}`}
                            title={i < sigCount ? "חתום" : "חסרה חתימה"}
                          />
                        ))}
                      </div>
                      {/* File indicator */}
                      {protocol.file_url && (
                        <svg className="h-4 w-4 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Protocol Modal */}
      {showNewModal && (
        <NewProtocolModal
          onClose={() => setShowNewModal(false)}
          onCreated={(id) => {
            setShowNewModal(false);
            router.push(`/dashboard/protocols/${id}`);
          }}
        />
      )}
    </div>
  );
}

// ── New Protocol Modal ─────────────────────────────────────────────────────

interface NewProtocolModalProps {
  onClose: () => void;
  onCreated: (id: string) => void;
}

function NewProtocolModal({ onClose, onCreated }: NewProtocolModalProps) {
  const [form, setForm] = useState({
    title: "",
    protocol_type: "committee" as ProtocolType,
    meeting_date: new Date().toISOString().split("T")[0],
    meeting_number: "",
    association_name: "",
    chairman_name: "",
    community_manager_name: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("שם הפרוטוקול הוא שדה חובה"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/protocols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          meeting_number: form.meeting_number ? parseInt(form.meeting_number) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "שגיאה"); return; }
      onCreated(json.data.id);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-secondary-100">
          <h2 className="font-bold text-secondary-900 text-lg">פרוטוקול חדש</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary-50 text-secondary-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">כותרת *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder='פרוטוקול ישיבת ועד — מרץ 2025'
              className="w-full text-sm border border-secondary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">סוג ישיבה *</label>
              <select
                value={form.protocol_type}
                onChange={(e) => setForm({ ...form, protocol_type: e.target.value as ProtocolType })}
                className="w-full text-sm border border-secondary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="committee">ועד</option>
                <option value="general_assembly">אסיפה כללית</option>
                <option value="association">אגודה</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">תאריך ישיבה *</label>
              <input
                type="date"
                value={form.meeting_date}
                onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
                className="w-full text-sm border border-secondary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">מספר ישיבה</label>
              <input
                type="number"
                value={form.meeting_number}
                onChange={(e) => setForm({ ...form, meeting_number: e.target.value })}
                placeholder="2"
                className="w-full text-sm border border-secondary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">מיקום</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="בית הוועד"
                className="w-full text-sm border border-secondary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">שם האגודה</label>
            <input
              type="text"
              value={form.association_name}
              onChange={(e) => setForm({ ...form, association_name: e.target.value })}
              className="w-full text-sm border border-secondary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">יו&quot;ר ועד</label>
              <input
                type="text"
                value={form.chairman_name}
                onChange={(e) => setForm({ ...form, chairman_name: e.target.value })}
                className="w-full text-sm border border-secondary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">מנהל קהילה</label>
              <input
                type="text"
                value={form.community_manager_name}
                onChange={(e) => setForm({ ...form, community_manager_name: e.target.value })}
                className="w-full text-sm border border-secondary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "יוצר..." : "צור פרוטוקול"}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-secondary-200 rounded-xl text-sm text-secondary-600 hover:bg-secondary-50 transition-colors">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
