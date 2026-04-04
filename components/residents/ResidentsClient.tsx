"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ResidentModal } from "./ResidentModal";
import { RequestStatusBadge } from "@/components/requests/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  createResidentClient,
  updateResidentClient,
  deleteResidentClient,
  getResidentsClient,
} from "@/services/residents";
import type { Resident, ResidentFormData, Request } from "@/types/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roleLabel = (role: string) => (role === "admin" ? "מנהל" : "תושב");
const roleColor = (role: string) =>
  role === "admin"
    ? "bg-purple-100 text-purple-700"
    : "bg-blue-100 text-blue-700";

const balanceColor = (balance: number) =>
  balance < 0 ? "text-red-600 font-semibold" :
  balance > 0 ? "text-green-600 font-semibold" :
  "text-secondary-500";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ResidentsClientProps {
  initialResidents: Resident[];
  isAdmin: boolean;
  allRequests?: Request[]; // for linked-requests panel
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResidentsClient({
  initialResidents,
  isAdmin,
  allRequests = [],
}: ResidentsClientProps) {
  const toast = useToast();

  const [residents, setResidents]           = useState<Resident[]>(initialResidents);
  const [search, setSearch]                 = useState("");
  const [modalOpen, setModalOpen]           = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [expandedId, setExpandedId]         = useState<string | null>(null);

  const refreshResidents = useCallback(async () => {
    try { setResidents(await getResidentsClient()); } catch { /* silent */ }
  }, []);

  const handleSave = async (formData: ResidentFormData) => {
    if (editingResident) {
      const { data, error } = await updateResidentClient(editingResident.id, formData);
      if (error) throw new Error(error);
      setResidents(prev => prev.map(r => r.id === editingResident.id ? (data as Resident) : r));
      toast.success("פרטי התושב עודכנו");
    } else {
      const { data, error } = await createResidentClient(formData);
      if (error) throw new Error(error);
      setResidents(prev => [data as Resident, ...prev]);
      toast.success("התושב נוסף בהצלחה");
    }
    await refreshResidents();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    const { error } = await deleteResidentClient(deleteConfirmId);
    setDeleteLoading(false);
    if (error) { toast.error(error); }
    else {
      setResidents(prev => prev.filter(r => r.id !== deleteConfirmId));
      toast.success("התושב נמחק");
    }
    setDeleteConfirmId(null);
  };

  const filtered = residents.filter(
    r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.phone ?? "").includes(search) ||
      (r.address ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const linkedRequests = (residentId: string) =>
    allRequests.filter(req => req.resident_id === residentId);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">תושבים</h1>
          <p className="text-sm text-secondary-500 mt-0.5">{residents.length} תושבים רשומים</p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={() => { setEditingResident(null); setModalOpen(true); }} className="shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            הוסף תושב
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="p-3 lg:p-4">
        <div className="relative">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש לפי שם, טלפון או כתובת..."
            className="w-full pr-10 pl-4 py-2.5 border border-secondary-200 rounded-xl text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </Card>

      {/* Mobile card list */}
      <div className="flex flex-col gap-3 lg:hidden">
        {filtered.length === 0 ? (
          <Card className="py-16 text-center text-secondary-400">
            <p className="text-5xl mb-3">🏘️</p>
            <p className="text-base font-medium text-secondary-600">
              {search ? "לא נמצאו תושבים תואמים" : "אין תושבים עדיין"}
            </p>
          </Card>
        ) : (
          filtered.map(resident => {
            const reqs = linkedRequests(resident.id);
            const isExpanded = expandedId === resident.id;
            return (
              <Card key={resident.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-base font-bold flex-shrink-0">
                      {resident.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-secondary-900">{resident.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(resident.role)}`}>
                          {roleLabel(resident.role)}
                        </span>
                      </div>
                      {resident.phone && (
                        <a href={`tel:${resident.phone}`} className="text-sm text-secondary-500 hover:text-primary-600 transition-colors block mt-0.5" dir="ltr">
                          {resident.phone}
                        </a>
                      )}
                      {resident.address && (
                        <p className="text-sm text-secondary-500 truncate">{resident.address}</p>
                      )}
                      <p className={`text-sm mt-1 ${balanceColor(resident.balance)}`} dir="ltr">
                        ₪{resident.balance.toLocaleString("he-IL", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => { setEditingResident(resident); setModalOpen(true); }}
                          className="p-2 rounded-lg text-secondary-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(resident.id)}
                          className="p-2 rounded-lg text-secondary-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Linked requests toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : resident.id)}
                    className="flex items-center gap-1.5 mt-3 pt-3 border-t border-secondary-100 text-xs text-secondary-400 hover:text-primary-600 transition-colors w-full"
                  >
                    <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {reqs.length > 0 ? `${reqs.length} פניות` : "פניות"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-secondary-100 bg-secondary-50/60 px-4 py-3 space-y-2">
                    {reqs.length === 0 ? (
                      <p className="text-xs text-secondary-400 text-center py-2">אין פניות לתושב זה</p>
                    ) : (
                      reqs.map(req => (
                        <div key={req.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm">
                          <RequestStatusBadge status={req.status} />
                          <span className="text-sm font-medium text-secondary-800 flex-1 truncate">{req.title}</span>
                          <span className="text-xs text-secondary-400">{new Date(req.created_at).toLocaleDateString("he-IL")}</span>
                        </div>
                      ))
                    )}
                    <Link
                      href="/dashboard/requests"
                      className="block text-center text-xs text-primary-600 hover:underline pt-1"
                    >
                      לכל הפניות →
                    </Link>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <Card className="overflow-hidden hidden lg:block">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-secondary-400">
            <p className="text-5xl mb-3">🏘️</p>
            <p className="text-base font-medium text-secondary-600">
              {search ? "לא נמצאו תושבים תואמים" : "אין תושבים עדיין"}
            </p>
            {isAdmin && !search && (
              <p className="text-sm mt-1">לחץ &quot;הוסף תושב&quot; כדי להתחיל</p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary-50 border-b border-secondary-100">
                <th className="text-right px-5 py-3 font-semibold text-secondary-600">שם</th>
                <th className="text-right px-5 py-3 font-semibold text-secondary-600">טלפון</th>
                <th className="text-right px-5 py-3 font-semibold text-secondary-600">כתובת</th>
                <th className="text-right px-5 py-3 font-semibold text-secondary-600">תפקיד</th>
                <th className="text-right px-5 py-3 font-semibold text-secondary-600">יתרה</th>
                <th className="text-right px-5 py-3 font-semibold text-secondary-600">פניות</th>
                {isAdmin && <th className="text-center px-5 py-3 font-semibold text-secondary-600">פעולות</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(resident => {
                const reqs = linkedRequests(resident.id);
                const isExpanded = expandedId === resident.id;
                return [
                  <tr
                    key={`row-${resident.id}`}
                    className="hover:bg-secondary-50/50 transition-colors border-b border-secondary-50"
                  >
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {resident.name.charAt(0)}
                        </div>
                        <span className="font-medium text-secondary-900">{resident.name}</span>
                      </div>
                    </td>
                    {/* Phone */}
                    <td className="px-5 py-3.5 text-secondary-600" dir="ltr">
                      {resident.phone
                        ? <a href={`tel:${resident.phone}`} className="hover:text-primary-600 transition-colors">{resident.phone}</a>
                        : <span className="text-secondary-300">—</span>}
                    </td>
                    {/* Address */}
                    <td className="px-5 py-3.5 text-secondary-600 max-w-[160px] truncate">
                      {resident.address || <span className="text-secondary-300">—</span>}
                    </td>
                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColor(resident.role)}`}>
                        {roleLabel(resident.role)}
                      </span>
                    </td>
                    {/* Balance */}
                    <td className={`px-5 py-3.5 ${balanceColor(resident.balance)}`} dir="ltr">
                      ₪{resident.balance.toLocaleString("he-IL", { minimumFractionDigits: 2 })}
                    </td>
                    {/* Requests toggle */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : resident.id)}
                        className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition-colors ${
                          reqs.length > 0
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "bg-secondary-100 text-secondary-500 hover:bg-secondary-200"
                        }`}
                      >
                        {reqs.length > 0 ? `${reqs.length} פניות` : "ללא פניות"}
                        <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </td>
                    {/* Actions */}
                    {isAdmin && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setEditingResident(resident); setModalOpen(true); }}
                            className="p-1.5 rounded-lg text-secondary-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                            title="עריכה"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(resident.id)}
                            className="p-1.5 rounded-lg text-secondary-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="מחיקה"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>,
                  // Expanded linked requests
                  isExpanded && (
                    <tr key={`expand-${resident.id}`}>
                      <td colSpan={isAdmin ? 7 : 6} className="bg-secondary-50/60 px-6 py-3">
                        {reqs.length === 0 ? (
                          <p className="text-xs text-secondary-400 text-center py-1">אין פניות לתושב זה</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {reqs.map(req => (
                              <div key={req.id} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm">
                                <RequestStatusBadge status={req.status} />
                                <span className="text-sm font-medium text-secondary-800">{req.title}</span>
                                <span className="text-xs text-secondary-400">{new Date(req.created_at).toLocaleDateString("he-IL")}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ),
                ].filter(Boolean);
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal */}
      <ResidentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        resident={editingResident}
      />

      {/* Delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-secondary-900">אישור מחיקה</h3>
                <p className="text-sm text-secondary-500 mt-1">האם אתה בטוח שברצונך למחוק את התושב?<br />פעולה זו אינה ניתנת לביטול.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="danger" size="lg" className="flex-1" onClick={handleDeleteConfirm} isLoading={deleteLoading}>כן, מחק</Button>
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setDeleteConfirmId(null)} disabled={deleteLoading}>ביטול</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
