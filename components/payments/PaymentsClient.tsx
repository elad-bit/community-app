"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────
interface Unit {
  id: string;
  unit_number: string;
  building?: string;
  floor?: number;
  area_sqm?: number;
  residents?: { id: string; name: string; phone?: string }[];
  balance_info?: { total_charged: number; total_paid: number; balance: number; open_charges_count: number };
}

interface Charge {
  id: string;
  unit_id: string;
  description: string;
  amount: number;
  paid_amount: number;
  remaining: number;
  due_date: string;
  period_month?: number;
  period_year?: number;
  status: string;
  notes?: string;
  units?: { unit_number: string; building?: string };
  residents?: { name: string } | null;
  payments?: Payment[];
}

interface Payment {
  id: string;
  charge_id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference?: string;
  notes?: string;
  charges?: { description: string; amount: number };
}

interface FeeTemplate { id: string; name: string; amount: number; frequency: string }

// ── Constants ─────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין", paid: "שולם", partial: "חלקי", overdue: "פגר תשלום", cancelled: "מבוטל",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid:    "bg-green-100 text-green-700",
  partial: "bg-blue-100 text-blue-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};
const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "העברה בנקאית", check: "צ'ק", cash: "מזומן",
  bit: "ביט", credit_card: "כרטיס אשראי", other: "אחר",
};
const MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

const fmt = (n: number) => "₪" + Number(n).toLocaleString("he-IL", { maximumFractionDigits: 0 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

// ── Main Component ────────────────────────────────────────────
export function PaymentsClient({ canManage }: { canManage: boolean }) {
  const [tab, setTab] = useState<"units" | "charges" | "payments">("units");
  const [units, setUnits] = useState<Unit[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [feeTemplates, setFeeTemplates] = useState<FeeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState<Charge | null>(null);
  const [showChargeDetail, setShowChargeDetail] = useState<Charge | null>(null);

  // Filters
  const [chargeStatusFilter, setChargeStatusFilter] = useState("all");
  const [searchUnit, setSearchUnit] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c, p, ft] = await Promise.all([
        fetch("/api/units").then(r => r.json()),
        fetch("/api/charges").then(r => r.json()),
        fetch("/api/payments").then(r => r.json()),
        fetch("/api/fee-templates").then(r => r.json()),
      ]);
      if (u.data)  setUnits(u.data);
      if (c.data)  setCharges(c.data);
      if (p.data)  setPayments(p.data);
      if (ft.data) setFeeTemplates(ft.data);
    } catch {
      setError("שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Summary stats
  const totalCharged = charges.filter(c => c.status !== "cancelled").reduce((s, c) => s + Number(c.amount), 0);
  const totalPaid    = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalDebt    = totalCharged - totalPaid;
  const overdueCount = charges.filter(c => c.status === "overdue" || (c.status === "pending" && new Date(c.due_date) < new Date())).length;

  const filteredCharges = charges.filter(c => {
    if (chargeStatusFilter !== "all" && c.status !== chargeStatusFilter) return false;
    if (searchUnit) {
      const u = units.find(u => u.id === c.unit_id);
      if (!u?.unit_number.includes(searchUnit)) return false;
    }
    return true;
  });

  const filteredUnits = units.filter(u =>
    !searchUnit || u.unit_number.toLowerCase().includes(searchUnit.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-secondary-400 text-sm">טוען...</div>
    </div>
  );

  return (
    <div dir="rtl">
      {error && <div className="mb-4 bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "סה״כ חיובים", value: fmt(totalCharged), color: "text-secondary-700" },
          { label: "סה״כ שולם", value: fmt(totalPaid), color: "text-green-600" },
          { label: "יתרת חוב", value: fmt(totalDebt), color: totalDebt > 0 ? "text-red-600" : "text-green-600" },
          { label: "פיגורים", value: String(overdueCount), color: overdueCount > 0 ? "text-red-600" : "text-secondary-400", suffix: " חיובים" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-secondary-100 p-4">
            <p className="text-xs text-secondary-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}{s.suffix ?? ""}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary-100 rounded-xl p-1 mb-5 w-fit">
        {(["units", "charges", "payments"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? "bg-white text-primary-700 shadow-sm" : "text-secondary-500 hover:text-secondary-700"}`}
          >
            {t === "units" ? `🏠 דירות (${units.length})` : t === "charges" ? `📋 חיובים (${charges.length})` : `💳 תשלומים (${payments.length})`}
          </button>
        ))}
      </div>

      {/* ── UNITS TAB ── */}
      {tab === "units" && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <input
              value={searchUnit}
              onChange={e => setSearchUnit(e.target.value)}
              placeholder="חיפוש לפי מספר דירה..."
              className="border border-secondary-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 w-52"
            />
            {canManage && (
              <button
                onClick={() => setShowAddUnit(true)}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                + הוסף דירה
              </button>
            )}
          </div>

          {filteredUnits.length === 0 ? (
            <EmptyState icon="🏠" text="אין דירות רשומות" sub={canManage ? "הוסף את הדירות הראשונות" : ""} />
          ) : (
            <div className="grid gap-3">
              {filteredUnits.map(unit => {
                const b = unit.balance_info ?? { total_charged: 0, total_paid: 0, balance: 0, open_charges_count: 0 };
                return (
                  <div key={unit.id} className="bg-white border border-secondary-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-secondary-900">דירה {unit.unit_number}</h3>
                          {unit.building && <span className="text-xs text-secondary-400">בניין {unit.building}</span>}
                          {unit.floor != null && <span className="text-xs text-secondary-400">קומה {unit.floor}</span>}
                          {unit.area_sqm && <span className="text-xs text-secondary-400">{unit.area_sqm} מ״ר</span>}
                        </div>
                        {(unit.residents || []).length > 0 && (
                          <p className="text-sm text-secondary-500 mt-1">
                            {(unit.residents || []).map(r => r.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="text-left flex-shrink-0">
                        <p className={`text-lg font-bold ${Number(b.balance) > 0 ? "text-red-600" : "text-green-600"}`}>
                          {Number(b.balance) > 0 ? "-" : ""}{fmt(Math.abs(Number(b.balance)))}
                        </p>
                        <p className="text-xs text-secondary-400">{b.open_charges_count} חיובים פתוחים</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-secondary-50 text-xs text-secondary-400">
                      <span>חויב: {fmt(Number(b.total_charged))}</span>
                      <span>שולם: {fmt(Number(b.total_paid))}</span>
                      <button
                        className="mr-auto text-primary-600 hover:text-primary-800 font-medium"
                        onClick={() => { setTab("charges"); setSearchUnit(unit.unit_number); }}
                      >
                        צפה בחיובים ←
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CHARGES TAB ── */}
      {tab === "charges" && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <input
              value={searchUnit}
              onChange={e => setSearchUnit(e.target.value)}
              placeholder="סינון לפי דירה..."
              className="border border-secondary-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 w-44"
            />
            <select
              value={chargeStatusFilter}
              onChange={e => setChargeStatusFilter(e.target.value)}
              className="border border-secondary-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="all">כל הסטטוסים</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {canManage && (
              <button
                onClick={() => setShowAddCharge(true)}
                className="mr-auto flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                + חיוב חדש
              </button>
            )}
          </div>

          {filteredCharges.length === 0 ? (
            <EmptyState icon="📋" text="אין חיובים" sub={canManage ? "צור חיוב חדש" : ""} />
          ) : (
            <div className="bg-white border border-secondary-100 rounded-xl overflow-hidden">
              <div className="divide-y divide-secondary-50">
                {filteredCharges.map(charge => (
                  <div
                    key={charge.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary-50 cursor-pointer transition-colors"
                    onClick={() => setShowChargeDetail(charge)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-secondary-900">
                          דירה {charge.units?.unit_number}
                        </span>
                        <span className="text-xs text-secondary-400">—</span>
                        <span className="text-sm text-secondary-700 truncate">{charge.description}</span>
                      </div>
                      <p className="text-xs text-secondary-400 mt-0.5">
                        לתשלום עד: {fmtDate(charge.due_date)}
                        {charge.period_month && ` • ${MONTHS[charge.period_month - 1]} ${charge.period_year ?? ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-left">
                        <p className="text-sm font-bold text-secondary-900">{fmt(charge.amount)}</p>
                        {Number(charge.paid_amount) > 0 && (
                          <p className="text-xs text-green-600">שולם: {fmt(charge.paid_amount)}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[charge.status]}`}>
                        {STATUS_LABELS[charge.status]}
                      </span>
                      {canManage && charge.status !== "paid" && charge.status !== "cancelled" && (
                        <button
                          className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1 rounded-lg font-medium transition-colors"
                          onClick={e => { e.stopPropagation(); setShowAddPayment(charge); }}
                        >
                          רשום תשלום
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {tab === "payments" && (
        <div>
          {payments.length === 0 ? (
            <EmptyState icon="💳" text="אין תשלומים רשומים" sub="" />
          ) : (
            <div className="bg-white border border-secondary-100 rounded-xl overflow-hidden">
              <div className="divide-y divide-secondary-50">
                {payments.map(payment => (
                  <div key={payment.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm flex-shrink-0">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900">
                        {(payment as any).units?.unit_number ? `דירה ${(payment as any).units.unit_number}` : ""}
                        {payment.charges?.description ? ` — ${payment.charges.description}` : ""}
                      </p>
                      <p className="text-xs text-secondary-400">
                        {fmtDate(payment.payment_date)} • {METHOD_LABELS[payment.method] ?? payment.method}
                        {payment.reference && ` • ${payment.reference}`}
                      </p>
                    </div>
                    <span className="font-bold text-green-600 text-sm flex-shrink-0">{fmt(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}
      {showAddUnit && (
        <AddUnitModal
          onClose={() => setShowAddUnit(false)}
          onSaved={() => { setShowAddUnit(false); loadAll(); }}
        />
      )}
      {showAddCharge && (
        <AddChargeModal
          units={units}
          feeTemplates={feeTemplates}
          onClose={() => setShowAddCharge(false)}
          onSaved={() => { setShowAddCharge(false); loadAll(); }}
        />
      )}
      {showAddPayment && (
        <AddPaymentModal
          charge={showAddPayment}
          units={units}
          onClose={() => setShowAddPayment(null)}
          onSaved={() => { setShowAddPayment(null); loadAll(); }}
        />
      )}
      {showChargeDetail && (
        <ChargeDetailModal
          charge={showChargeDetail}
          canManage={canManage}
          onClose={() => setShowChargeDetail(null)}
          onPayment={() => { setShowAddPayment(showChargeDetail); setShowChargeDetail(null); }}
          onRefresh={loadAll}
        />
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────
function EmptyState({ icon, text, sub }: { icon: string; text: string; sub: string }) {
  return (
    <div className="text-center py-16 text-secondary-400">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-medium text-secondary-600">{text}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
    </div>
  );
}

// ── Add Unit Modal ────────────────────────────────────────────
function AddUnitModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ unit_number: "", floor: "", building: "", area_sqm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_number: form.unit_number,
          floor: form.floor ? Number(form.floor) : null,
          building: form.building || null,
          area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "שגיאה"); return; }
      onSaved();
    } catch { setError("שגיאת רשת"); } finally { setLoading(false); }
  };

  return (
    <Modal title="הוספת דירה" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="מספר דירה *">
          <input required value={form.unit_number} onChange={e => setForm(p => ({ ...p, unit_number: e.target.value }))}
            className={inputCls} placeholder="למשל: 1, 2א, גג" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="קומה">
            <input type="number" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}
              className={inputCls} placeholder="0" />
          </Field>
          <Field label="בניין">
            <input value={form.building} onChange={e => setForm(p => ({ ...p, building: e.target.value }))}
              className={inputCls} placeholder="א, ב..." />
          </Field>
        </div>
        <Field label="שטח (מ״ר)">
          <input type="number" step="0.1" value={form.area_sqm} onChange={e => setForm(p => ({ ...p, area_sqm: e.target.value }))}
            className={inputCls} placeholder="75" />
        </Field>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
        <ModalButtons loading={loading} onClose={onClose} submitLabel="הוסף דירה" />
      </form>
    </Modal>
  );
}

// ── Add Charge Modal ──────────────────────────────────────────
function AddChargeModal({ units, feeTemplates, onClose, onSaved }:
  { units: Unit[]; feeTemplates: FeeTemplate[]; onClose: () => void; onSaved: () => void }) {
  const now = new Date();
  const [form, setForm] = useState({
    unit_id: "", description: "", amount: "", due_date: "",
    period_month: String(now.getMonth() + 1), period_year: String(now.getFullYear()),
    notes: "", fee_template_id: "",
  });
  const [bulk, setBulk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const applyTemplate = (templateId: string) => {
    const t = feeTemplates.find(f => f.id === templateId);
    if (t) setForm(p => ({ ...p, fee_template_id: templateId, description: t.name, amount: String(t.amount) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const body: any = {
        description: form.description, amount: form.amount,
        due_date: form.due_date,
        period_month: form.period_month ? Number(form.period_month) : null,
        period_year:  form.period_year  ? Number(form.period_year)  : null,
        notes: form.notes || null,
        fee_template_id: form.fee_template_id || null,
      };
      if (bulk) {
        body.bulk = true;
        body.unit_ids = units.map(u => u.id);
      } else {
        body.unit_id = form.unit_id;
      }
      const res = await fetch("/api/charges", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "שגיאה"); return; }
      onSaved();
    } catch { setError("שגיאת רשת"); } finally { setLoading(false); }
  };

  return (
    <Modal title="חיוב חדש" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {feeTemplates.length > 0 && (
          <Field label="תבנית חיוב (אופציונלי)">
            <select value={form.fee_template_id} onChange={e => applyTemplate(e.target.value)} className={inputCls}>
              <option value="">— בחר תבנית —</option>
              {feeTemplates.map(t => <option key={t.id} value={t.id}>{t.name} — ₪{t.amount}</option>)}
            </select>
          </Field>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={bulk} onChange={e => setBulk(e.target.checked)} className="h-4 w-4" />
          <span className="text-sm font-medium text-secondary-700">חייב את כל הדירות ({units.length})</span>
        </label>
        {!bulk && (
          <Field label="דירה *">
            <select required value={form.unit_id} onChange={e => setForm(p => ({ ...p, unit_id: e.target.value }))} className={inputCls}>
              <option value="">— בחר דירה —</option>
              {units.map(u => <option key={u.id} value={u.id}>דירה {u.unit_number}{u.building ? ` (${u.building})` : ""}</option>)}
            </select>
          </Field>
        )}
        <Field label="תיאור *">
          <input required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className={inputCls} placeholder="ועד בית חודשי" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="סכום (₪) *">
            <input required type="number" min="0" step="0.01" value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={inputCls} placeholder="500" />
          </Field>
          <Field label="תאריך פירעון *">
            <input required type="date" value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="חודש">
            <select value={form.period_month} onChange={e => setForm(p => ({ ...p, period_month: e.target.value }))} className={inputCls}>
              <option value="">—</option>
              {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </select>
          </Field>
          <Field label="שנה">
            <input type="number" value={form.period_year} onChange={e => setForm(p => ({ ...p, period_year: e.target.value }))}
              className={inputCls} placeholder="2026" />
          </Field>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
        <ModalButtons loading={loading} onClose={onClose} submitLabel={bulk ? `חייב ${units.length} דירות` : "צור חיוב"} submitColor="bg-primary-600 hover:bg-primary-700" />
      </form>
    </Modal>
  );
}

// ── Add Payment Modal ─────────────────────────────────────────
function AddPaymentModal({ charge, units, onClose, onSaved }:
  { charge: Charge; units: Unit[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    amount: String(charge.remaining ?? charge.amount),
    payment_date: new Date().toISOString().split("T")[0],
    method: "bank_transfer",
    reference: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const unitName = units.find(u => u.id === charge.unit_id)?.unit_number ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charge_id: charge.id,
          unit_id: charge.unit_id,
          resident_id: charge.resident_id ?? null,
          amount: Number(form.amount),
          payment_date: form.payment_date,
          method: form.method,
          reference: form.reference || null,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "שגיאה"); return; }
      onSaved();
    } catch { setError("שגיאת רשת"); } finally { setLoading(false); }
  };

  return (
    <Modal title="רישום תשלום" onClose={onClose}>
      <div className="bg-secondary-50 rounded-xl p-3 mb-4 text-sm text-secondary-700">
        <p className="font-medium">דירה {unitName} — {charge.description}</p>
        <p className="text-xs text-secondary-400 mt-0.5">
          סכום חיוב: {fmt(charge.amount)} | שולם: {fmt(Number(charge.paid_amount))} | נותר: {fmt(Number(charge.remaining))}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="סכום (₪) *">
            <input required type="number" min="0.01" step="0.01" value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="תאריך תשלום *">
            <input required type="date" value={form.payment_date}
              onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} className={inputCls} />
          </Field>
        </div>
        <Field label="אמצעי תשלום">
          <select value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))} className={inputCls}>
            {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="אסמכתא / מספר צ'ק">
          <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
            className={inputCls} placeholder="12345" />
        </Field>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
        <ModalButtons loading={loading} onClose={onClose} submitLabel="אישור תשלום" submitColor="bg-green-600 hover:bg-green-700" />
      </form>
    </Modal>
  );
}

// ── Charge Detail Modal ───────────────────────────────────────
function ChargeDetailModal({ charge, canManage, onClose, onPayment, onRefresh }:
  { charge: Charge; canManage: boolean; onClose: () => void; onPayment: () => void; onRefresh: () => void }) {

  const handleCancel = async () => {
    if (!confirm("לבטל חיוב זה?")) return;
    await fetch(`/api/charges?id=${charge.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    onRefresh(); onClose();
  };

  const handleDeletePayment = async (payId: string) => {
    if (!confirm("למחוק תשלום זה?")) return;
    await fetch(`/api/payments?id=${payId}`, { method: "DELETE" });
    onRefresh(); onClose();
  };

  return (
    <Modal title="פרטי חיוב" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-secondary-50 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-secondary-900">{charge.description}</p>
              <p className="text-sm text-secondary-500 mt-0.5">
                דירה {charge.units?.unit_number}
                {charge.period_month && ` • ${MONTHS[charge.period_month - 1]} ${charge.period_year ?? ""}`}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[charge.status]}`}>
              {STATUS_LABELS[charge.status]}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            {[
              { label: "חויב", v: fmt(charge.amount) },
              { label: "שולם", v: fmt(Number(charge.paid_amount)), cls: "text-green-600" },
              { label: "נותר", v: fmt(Number(charge.remaining)), cls: Number(charge.remaining) > 0 ? "text-red-600" : "text-green-600" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg p-2">
                <p className={`text-base font-bold ${s.cls ?? ""}`}>{s.v}</p>
                <p className="text-xs text-secondary-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment history */}
        {(charge.payments || []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-secondary-500 mb-2">היסטוריית תשלומים</p>
            <div className="space-y-1">
              {(charge.payments || []).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-sm bg-green-50 rounded-lg px-3 py-2">
                  <span className="text-green-600">✓</span>
                  <span className="font-medium">{fmt(p.amount)}</span>
                  <span className="text-secondary-400">{fmtDate(p.payment_date)}</span>
                  <span className="text-secondary-400">• {METHOD_LABELS[p.method] ?? p.method}</span>
                  {p.reference && <span className="text-secondary-400">• {p.reference}</span>}
                  {canManage && (
                    <button onClick={() => handleDeletePayment(p.id)} className="mr-auto text-red-400 hover:text-red-600 text-xs">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {canManage && (
          <div className="flex gap-2 pt-2">
            {charge.status !== "paid" && charge.status !== "cancelled" && (
              <button
                onClick={onPayment}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                רשום תשלום
              </button>
            )}
            {charge.status !== "cancelled" && (
              <button
                onClick={handleCancel}
                className="px-4 py-2.5 border border-secondary-200 rounded-xl text-sm text-secondary-600 hover:bg-secondary-50 transition-colors"
              >
                בטל חיוב
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────
const inputCls = "w-full text-sm border border-secondary-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-secondary-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-secondary-100">
          <h2 className="font-bold text-secondary-900 text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary-50 text-secondary-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ModalButtons({ loading, onClose, submitLabel, submitColor = "bg-primary-600 hover:bg-primary-700" }:
  { loading: boolean; onClose: () => void; submitLabel: string; submitColor?: string }) {
  return (
    <div className="flex gap-3 pt-1">
      <button type="submit" disabled={loading}
        className={`flex-1 py-2.5 font-medium rounded-xl text-sm transition-colors disabled:opacity-50 text-white ${submitColor}`}>
        {loading ? "שומר..." : submitLabel}
      </button>
      <button type="button" onClick={onClose}
        className="px-5 py-2.5 border border-secondary-200 rounded-xl text-sm text-secondary-600 hover:bg-secondary-50 transition-colors">
        ביטול
      </button>
    </div>
  );
}
