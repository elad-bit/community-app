"use client";

import { useState } from "react";
import type { BudgetItem, BudgetTransaction, BudgetSummary, BudgetItemFormData, BudgetTransactionFormData } from "@/types/index";

interface Props {
  items: BudgetItem[];
  transactions: BudgetTransaction[];
  summary: BudgetSummary;
  canManage: boolean;
  year: number;
  userId: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("he-IL");

const SOURCE_LABELS: Record<string, string> = { manual: "ידני", bank: "בנק", accounting: "הנה\"ח" };
const SOURCE_COLORS: Record<string, string> = { manual: "bg-gray-100 text-gray-600", bank: "bg-blue-100 text-blue-700", accounting: "bg-purple-100 text-purple-700" };

export function BudgetClient({ items: initialItems, transactions: initialTxs, summary: initialSummary, canManage, year, userId }: Props) {
  const [items, setItems] = useState<BudgetItem[]>(initialItems);
  const [txs, setTxs] = useState<BudgetTransaction[]>(initialTxs);
  const [summary, setSummary] = useState<BudgetSummary>(initialSummary);
  const [activeTab, setActiveTab] = useState<"items" | "transactions">("items");
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<"all" | "income" | "expense">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Item form state
  const [itemForm, setItemForm] = useState<BudgetItemFormData>({ category: "", description: "", planned_amount: 0, year });

  // Transaction form state
  const [txForm, setTxForm] = useState<BudgetTransactionFormData>({
    type: "expense", amount: 0, description: "", supplier: "", transaction_date: new Date().toISOString().split("T")[0], budget_item_id: null,
  });

  async function refreshData() {
    const res = await fetch(`/api/budget/items?year=${year}`);
    const json = await res.json();
    if (json.data) setItems(json.data);
    if (json.transactions) setTxs(json.transactions);
    if (json.summary) setSummary(json.summary);
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/budget/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...itemForm, year }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      await refreshData();
      setShowItemModal(false);
      setItemForm({ category: "", description: "", planned_amount: 0, year });
    } finally { setLoading(false); }
  }

  async function handleAddTx(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/budget/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txForm),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      await refreshData();
      setShowTxModal(false);
      setTxForm({ type: "expense", amount: 0, description: "", supplier: "", transaction_date: new Date().toISOString().split("T")[0], budget_item_id: null });
    } finally { setLoading(false); }
  }

  async function handleDeleteTx(id: string) {
    if (!confirm("למחוק עסקה זו?")) return;
    setLoading(true);
    try {
      await fetch(`/api/budget/transactions?id=${id}`, { method: "DELETE" });
      await refreshData();
    } finally { setLoading(false); }
  }

  const filteredTxs = txs.filter(t => {
    if (txFilter !== "all" && t.type !== txFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.description.toLowerCase().includes(q) || (t.supplier || "").toLowerCase().includes(q);
    }
    return true;
  });

  const pctColor = summary.pct_executed > 100 ? "bg-red-500" : summary.pct_executed > 80 ? "bg-amber-400" : "bg-blue-500";

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 תקציב {year}</h1>
          <p className="text-sm text-gray-500 mt-1">{summary.pct_executed}% בוצע · {fmt(summary.total_actual)} מתוך {fmt(summary.total_planned)}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => setShowTxModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              + עסקה חדשה
            </button>
            <button onClick={() => setShowItemModal(true)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              + סעיף חדש
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs text-gray-500 font-medium mb-1">תקציב מאושר</div>
          <div className="text-xl font-bold text-gray-900">{fmt(summary.total_planned)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs text-gray-500 font-medium mb-1">בוצע בפועל</div>
          <div className={`text-xl font-bold ${summary.pct_executed > 100 ? "text-red-600" : "text-gray-900"}`}>{fmt(summary.total_actual)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs text-gray-500 font-medium mb-1">יתרה</div>
          <div className={`text-xl font-bold ${summary.total_planned - summary.total_actual < 0 ? "text-red-600" : "text-green-600"}`}>
            {fmt(summary.total_planned - summary.total_actual)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs text-gray-500 font-medium mb-1">אחוז ביצוע</div>
          <div className={`text-xl font-bold ${summary.pct_executed > 100 ? "text-red-600" : summary.pct_executed > 80 ? "text-amber-600" : "text-blue-600"}`}>
            {summary.pct_executed}%
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-6">
        <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
          <span>ביצוע כולל {year}</span>
          <span>{summary.pct_executed}%</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${pctColor}`} style={{ width: `${Math.min(summary.pct_executed, 100)}%` }} />
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
        <button onClick={() => setActiveTab("items")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "items" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          📋 סעיפי תקציב ({items.length})
        </button>
        <button onClick={() => setActiveTab("transactions")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "transactions" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          💳 עסקאות ({txs.length})
        </button>
      </div>

      {/* Budget Items Tab */}
      {activeTab === "items" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm">אין סעיפי תקציב לשנה זו</p>
              {canManage && <button onClick={() => setShowItemModal(true)} className="mt-3 text-sm text-blue-600 hover:underline">+ הוסף סעיף ראשון</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">קטגוריה</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">תיאור</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">מתוכנן</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">בוצע</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">יתרה</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">התקדמות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => {
                    const actual = item.actual_amount ?? 0;
                    const pct = item.planned_amount > 0 ? Math.min(Math.round((actual / item.planned_amount) * 100), 100) : 0;
                    const isOver = actual > item.planned_amount;
                    return (
                      <tr key={item.id} className={isOver ? "bg-red-50" : ""}>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">{item.category}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{item.description}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{fmt(item.planned_amount)}</td>
                        <td className={`px-4 py-3 font-semibold ${isOver ? "text-red-600" : "text-gray-900"}`}>{fmt(actual)}</td>
                        <td className={`px-4 py-3 font-semibold ${isOver ? "text-red-600" : "text-green-600"}`}>
                          {isOver ? "⚠ " : ""}{fmt(item.planned_amount - actual)}
                        </td>
                        <td className="px-4 py-3 w-36">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${isOver ? "bg-red-500" : pct > 80 ? "bg-amber-400" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-8">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-bold text-gray-700">סה&quot;כ</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{fmt(summary.total_planned)}</td>
                    <td className={`px-4 py-3 font-bold ${summary.pct_executed > 100 ? "text-red-600" : "text-gray-900"}`}>{fmt(summary.total_actual)}</td>
                    <td className={`px-4 py-3 font-bold ${summary.total_planned - summary.total_actual < 0 ? "text-red-600" : "text-green-600"}`}>
                      {fmt(summary.total_planned - summary.total_actual)}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700">{summary.pct_executed}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <div>
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <input
              type="text"
              placeholder="חיפוש..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm flex-1 min-w-48 outline-none focus:border-blue-400"
            />
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {(["all","expense","income"] as const).map(f => (
                <button key={f} onClick={() => setTxFilter(f)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${txFilter === f ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>
                  {f === "all" ? "הכל" : f === "expense" ? "הוצאות" : "הכנסות"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {filteredTxs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-3xl mb-2">💳</div>
                <p className="text-sm">אין עסקאות</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTxs.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${tx.type === "expense" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                      {tx.type === "expense" ? "↓" : "↑"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{tx.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtDate(tx.transaction_date)}
                        {tx.supplier && ` · ${tx.supplier}`}
                        {(tx as any).budget_items && ` · ${(tx as any).budget_items.category}`}
                      </p>
                      {/* Protocol decision badge */}
                      {(tx as any).protocol_decision_id && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-medium">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          מאושר בפרוטוקול
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SOURCE_COLORS[tx.source]}`}>{SOURCE_LABELS[tx.source]}</span>
                      <span className={`font-bold text-sm ${tx.type === "expense" ? "text-red-600" : "text-green-600"}`}>
                        {tx.type === "expense" ? "-" : "+"}{fmt(Number(tx.amount))}
                      </span>
                      {canManage && tx.source === "manual" && (
                        <button onClick={() => handleDeleteTx(tx.id)} className="text-gray-300 hover:text-red-500 transition-colors text-xs ml-1">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Budget Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg">סעיף תקציבי חדש</h3>
              <button onClick={() => setShowItemModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">קטגוריה *</label>
                <input
                  value={itemForm.category}
                  onChange={e => setItemForm(p => ({ ...p, category: e.target.value }))}
                  placeholder="למשל: תשתיות, גינון, מנהלה"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">תיאור *</label>
                <input
                  value={itemForm.description}
                  onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="תיאור הסעיף"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סכום מתוכנן (₪) *</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={itemForm.planned_amount || ""}
                  onChange={e => setItemForm(p => ({ ...p, planned_amount: Number(e.target.value) }))}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                />
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowItemModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm">ביטול</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {loading ? "שומר..." : "הוסף סעיף"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg">עסקה חדשה</h3>
              <button onClick={() => setShowTxModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddTx} className="space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button type="button" onClick={() => setTxForm(p => ({ ...p, type: "expense" }))} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${txForm.type === "expense" ? "bg-white text-red-600 shadow-sm" : "text-gray-500"}`}>
                  ↓ הוצאה
                </button>
                <button type="button" onClick={() => setTxForm(p => ({ ...p, type: "income" }))} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${txForm.type === "income" ? "bg-white text-green-600 shadow-sm" : "text-gray-500"}`}>
                  ↑ הכנסה
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">תיאור *</label>
                <input
                  value={txForm.description}
                  onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="תיאור העסקה"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">סכום (₪) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={txForm.amount || ""}
                    onChange={e => setTxForm(p => ({ ...p, amount: Number(e.target.value) }))}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">תאריך *</label>
                  <input
                    type="date"
                    value={txForm.transaction_date}
                    onChange={e => setTxForm(p => ({ ...p, transaction_date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ספק / גוף</label>
                <input
                  value={txForm.supplier || ""}
                  onChange={e => setTxForm(p => ({ ...p, supplier: e.target.value }))}
                  placeholder="שם הספק (אופציונלי)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">שיוך לסעיף תקציבי</label>
                <select
                  value={txForm.budget_item_id || ""}
                  onChange={e => setTxForm(p => ({ ...p, budget_item_id: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white"
                >
                  <option value="">ללא שיוך</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.category} — {item.description}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTxModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm">ביטול</button>
                <button type="submit" disabled={loading} className={`flex-1 py-2.5 text-white font-semibold rounded-xl disabled:opacity-50 text-sm transition-colors ${txForm.type === "expense" ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"}`}>
                  {loading ? "שומר..." : txForm.type === "expense" ? "רשום הוצאה" : "רשום הכנסה"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
