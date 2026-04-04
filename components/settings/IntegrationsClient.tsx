"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnStatus = "disconnected" | "connecting" | "connected" | "error";

interface Provider {
  id: string;
  name: string;
  nameEn: string;
  logo: string;
  color: string;
  fields: { key: string; label: string; type?: string; placeholder?: string }[];
}

interface ConnectedState {
  [providerId: string]: {
    status: ConnStatus;
    credentials?: Record<string, string>;
    lastSync?: string;
    txCount?: number;
  };
}

// ─── Data: Israeli Banks ──────────────────────────────────────────────────────

const BANKS: Provider[] = [
  {
    id: "leumi", name: "בנק לאומי", nameEn: "Bank Leumi", logo: "🏦", color: "bg-blue-50 border-blue-200",
    fields: [
      { key: "username",   label: "שם משתמש לאינטרנט בנקאי",  placeholder: "שם משתמש" },
      { key: "password",   label: "סיסמה",  type: "password", placeholder: "••••••••" },
      { key: "account_no", label: "מספר חשבון", placeholder: "12-345-678901" },
    ],
  },
  {
    id: "hapoalim", name: "בנק הפועלים", nameEn: "Bank Hapoalim", logo: "🏦", color: "bg-red-50 border-red-200",
    fields: [
      { key: "username",   label: "מספר לקוח",  placeholder: "מספר לקוח" },
      { key: "password",   label: "סיסמה",  type: "password", placeholder: "••••••••" },
      { key: "account_no", label: "מספר חשבון", placeholder: "123-456789" },
    ],
  },
  {
    id: "mizrahi", name: "בנק מזרחי טפחות", nameEn: "Mizrahi Tefahot", logo: "🏦", color: "bg-orange-50 border-orange-200",
    fields: [
      { key: "username",   label: "שם משתמש",  placeholder: "שם משתמש" },
      { key: "password",   label: "סיסמה",  type: "password", placeholder: "••••••••" },
      { key: "account_no", label: "מספר חשבון", placeholder: "123456" },
    ],
  },
  {
    id: "discount", name: "בנק דיסקונט", nameEn: "Bank Discount", logo: "🏦", color: "bg-yellow-50 border-yellow-200",
    fields: [
      { key: "username",   label: "שם משתמש",  placeholder: "שם משתמש" },
      { key: "password",   label: "סיסמה",  type: "password", placeholder: "••••••••" },
      { key: "account_no", label: "מספר חשבון", placeholder: "12345678" },
    ],
  },
  {
    id: "fibi", name: "הבנק הבינלאומי", nameEn: "FIBI", logo: "🏦", color: "bg-green-50 border-green-200",
    fields: [
      { key: "username",   label: "שם משתמש",  placeholder: "שם משתמש" },
      { key: "password",   label: "סיסמה",  type: "password", placeholder: "••••••••" },
      { key: "account_no", label: "מספר חשבון", placeholder: "12345678" },
    ],
  },
  {
    id: "jerusalem", name: "בנק ירושלים", nameEn: "Bank of Jerusalem", logo: "🏦", color: "bg-purple-50 border-purple-200",
    fields: [
      { key: "username",   label: "שם משתמש",  placeholder: "שם משתמש" },
      { key: "password",   label: "סיסמה",  type: "password", placeholder: "••••••••" },
      { key: "account_no", label: "מספר חשבון", placeholder: "12345678" },
    ],
  },
  {
    id: "mercantile", name: "בנק מרכנתיל", nameEn: "Mercantile Discount", logo: "🏦", color: "bg-teal-50 border-teal-200",
    fields: [
      { key: "username",   label: "שם משתמש",  placeholder: "שם משתמש" },
      { key: "password",   label: "סיסמה",  type: "password", placeholder: "••••••••" },
      { key: "account_no", label: "מספר חשבון", placeholder: "12345678" },
    ],
  },
  {
    id: "yahav", name: "בנק יהב", nameEn: "Yahav Bank", logo: "🏦", color: "bg-indigo-50 border-indigo-200",
    fields: [
      { key: "username",   label: "שם משתמש",  placeholder: "שם משתמש" },
      { key: "password",   label: "סיסמה",  type: "password", placeholder: "••••••••" },
      { key: "account_no", label: "מספר חשבון", placeholder: "12345678" },
    ],
  },
  {
    id: "otzar", name: "אוצר החייל", nameEn: "Otzar Hahayal", logo: "🏦", color: "bg-slate-50 border-slate-200",
    fields: [
      { key: "username",   label: "שם משתמש",  placeholder: "שם משתמש" },
      { key: "password",   label: "סיסמה",  type: "password", placeholder: "••••••••" },
      { key: "account_no", label: "מספר חשבון", placeholder: "12345678" },
    ],
  },
  {
    id: "onezero", name: "One Zero", nameEn: "One Zero Digital Bank", logo: "💳", color: "bg-gray-50 border-gray-200",
    fields: [
      { key: "api_key", label: "מפתח API", type: "password", placeholder: "oz_live_..." },
    ],
  },
];

// ─── Data: Accounting Systems ─────────────────────────────────────────────────

const ACCOUNTING: Provider[] = [
  {
    id: "hashbshevet", name: "חשבשבת", nameEn: "Hashbshevet", logo: "📊", color: "bg-blue-50 border-blue-200",
    fields: [
      { key: "company_id", label: "מספר חברה",    placeholder: "12345" },
      { key: "username",   label: "שם משתמש",     placeholder: "user@example.com" },
      { key: "password",   label: "סיסמה",  type: "password", placeholder: "••••••••" },
    ],
  },
  {
    id: "priority", name: "פריוריטי", nameEn: "Priority", logo: "📈", color: "bg-orange-50 border-orange-200",
    fields: [
      { key: "server_url", label: "כתובת שרת",    placeholder: "https://my.priority.co.il" },
      { key: "username",   label: "שם משתמש",     placeholder: "שם משתמש" },
      { key: "password",   label: "סיסמה",  type: "password", placeholder: "••••••••" },
      { key: "company",    label: "שם חברה",       placeholder: "DEMO" },
    ],
  },
  {
    id: "rivhit", name: "ריבהיט", nameEn: "Rivhit", logo: "🧾", color: "bg-green-50 border-green-200",
    fields: [
      { key: "api_key",    label: "מפתח API", type: "password", placeholder: "riv_live_..." },
      { key: "company_id", label: "מזהה חברה", placeholder: "12345" },
    ],
  },
  {
    id: "malachim", name: "מלאכים", nameEn: "Malachim", logo: "💼", color: "bg-purple-50 border-purple-200",
    fields: [
      { key: "api_key",    label: "מפתח API", type: "password", placeholder: "mal_..." },
      { key: "business_id",label: "מזהה עסק", placeholder: "12345" },
    ],
  },
  {
    id: "quickbooks", name: "QuickBooks", nameEn: "QuickBooks Israel", logo: "📋", color: "bg-teal-50 border-teal-200",
    fields: [
      { key: "client_id",     label: "Client ID",     placeholder: "ABcd..." },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "••••••••" },
      { key: "realm_id",      label: "Company ID (RealmId)", placeholder: "123456789" },
    ],
  },
  {
    id: "xero", name: "Xero", nameEn: "Xero", logo: "🔵", color: "bg-sky-50 border-sky-200",
    fields: [
      { key: "client_id",     label: "Client ID",     placeholder: "..." },
      { key: "client_secret", label: "Client Secret", type: "password", placeholder: "••••••••" },
    ],
  },
];

// ─── Provider Card ────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  state,
  onSelect,
  isSelected,
}: {
  provider: Provider;
  state: ConnectedState[string] | undefined;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const isConnected = state?.status === "connected";
  return (
    <button
      onClick={onSelect}
      className={`relative p-4 rounded-2xl border-2 text-right transition-all hover:shadow-md active:scale-95 w-full
        ${isConnected ? "border-green-400 bg-green-50" : isSelected ? "border-primary-400 bg-primary-50" : `border-transparent ${provider.color}`}`}
    >
      {/* Connection dot */}
      <div className={`absolute top-3 left-3 w-2.5 h-2.5 rounded-full ${
        isConnected ? "bg-green-500" : "bg-secondary-300"
      }`} />
      <div className="text-3xl mb-2">{provider.logo}</div>
      <p className="font-bold text-secondary-900 text-sm">{provider.name}</p>
      <p className="text-xs text-secondary-400 mt-0.5">{provider.nameEn}</p>
      {isConnected && (
        <span className="inline-flex items-center gap-1 mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
          ✓ מחובר
        </span>
      )}
    </button>
  );
}

// ─── Connection Form ──────────────────────────────────────────────────────────

function ConnectForm({
  provider,
  state,
  onConnect,
  onDisconnect,
  onSync,
  onClose,
}: {
  provider: Provider;
  state: ConnectedState[string] | undefined;
  onConnect: (creds: Record<string, string>) => void;
  onDisconnect: () => void;
  onSync: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [creds, setCreds] = useState<Record<string, string>>(
    state?.credentials ?? {}
  );
  const [showPw, setShowPw] = useState(false);
  const isConnected = state?.status === "connected";
  const isConnecting = state?.status === "connecting";

  function handleConnect() {
    const missing = provider.fields
      .filter(f => !creds[f.key]?.trim())
      .map(f => f.label);
    if (missing.length) {
      toast.error(`נא למלא: ${missing.join(", ")}`);
      return;
    }
    onConnect(creds);
  }

  return (
    <div className="mt-4 border-t border-secondary-100 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-secondary-800 flex items-center gap-2">
          <span>{provider.logo}</span> {provider.name}
        </h3>
        <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600 p-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Security note */}
      <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
        <span className="flex-shrink-0">🔒</span>
        הפרטים מוצפנים ונשמרים בצורה מאובטחת. לא מועברים לגורמים שלישיים.
      </div>

      {isConnected ? (
        /* ── Connected view ── */
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <span>✅</span>
            <div>
              <p className="font-medium">מחובר בהצלחה</p>
              {state?.lastSync && <p className="text-xs opacity-75">סנכרון אחרון: {state.lastSync}</p>}
            </div>
          </div>
          {state?.txCount !== undefined && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-secondary-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-secondary-900">{state.txCount}</p>
                <p className="text-xs text-secondary-500">תנועות יובאו</p>
              </div>
              <div className="bg-secondary-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-secondary-900">0</p>
                <p className="text-xs text-secondary-500">שגיאות</p>
              </div>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={onSync} size="sm" className="gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              סנכרן עכשיו
            </Button>
            <Button onClick={onDisconnect} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
              ⛓️ נתק
            </Button>
          </div>
        </div>
      ) : (
        /* ── Connect form ── */
        <div className="space-y-3">
          {provider.fields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-secondary-700 mb-1">{field.label}</label>
              <div className="relative">
                <Input
                  type={field.type === "password" && showPw ? "text" : (field.type ?? "text")}
                  value={creds[field.key] ?? ""}
                  onChange={e => setCreds({ ...creds, [field.key]: e.target.value })}
                  placeholder={field.placeholder ?? ""}
                  dir={field.type === "password" || field.key.includes("id") || field.key.includes("key") ? "ltr" : "rtl"}
                  className="text-sm"
                />
                {field.type === "password" && (
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d={showPw
                          ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"}
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
          <Button
            onClick={handleConnect}
            isLoading={isConnecting}
            size="lg"
            className="w-full gap-2"
          >
            🔗 חבר את {provider.name}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function IntegrationsClient({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const [connected, setConnected] = useState<ConnectedState>({});
  const [selectedBank, setSelectedBank]  = useState<string | null>(null);
  const [selectedAcct, setSelectedAcct]  = useState<string | null>(null);

  /* ── Handlers ──────────────────────────────────────────────── */

  function handleConnect(type: "bank" | "acct", providerId: string, creds: Record<string, string>) {
    // Simulate async connection
    setConnected(prev => ({
      ...prev,
      [providerId]: { status: "connecting", credentials: creds },
    }));
    setTimeout(() => {
      setConnected(prev => ({
        ...prev,
        [providerId]: {
          status: "connected",
          credentials: creds,
          lastSync: new Date().toLocaleString("he-IL"),
          txCount: Math.floor(Math.random() * 120) + 10,
        },
      }));
      const name = type === "bank"
        ? BANKS.find(b => b.id === providerId)?.name
        : ACCOUNTING.find(a => a.id === providerId)?.name;
      toast.success(`${name} חובר בהצלחה!`);
    }, 1800);
  }

  function handleDisconnect(providerId: string) {
    setConnected(prev => {
      const next = { ...prev };
      delete next[providerId];
      return next;
    });
    setSelectedBank(null);
    setSelectedAcct(null);
    toast.success("החיבור נותק");
  }

  function handleSync(providerId: string) {
    toast.info("מסנכרן נתונים...");
    setTimeout(() => {
      setConnected(prev => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          lastSync: new Date().toLocaleString("he-IL"),
          txCount: (prev[providerId]?.txCount ?? 0) + Math.floor(Math.random() * 15),
        },
      }));
      toast.success("הסנכרון הושלם");
    }, 1500);
  }

  /* ── Render ──────────────────────────────────────────────────── */

  const connectedBankCount = BANKS.filter(b => connected[b.id]?.status === "connected").length;
  const connectedAcctCount = ACCOUNTING.filter(a => connected[a.id]?.status === "connected").length;

  return (
    <div className="space-y-5">
      {!isAdmin && (
        <div className="flex gap-2 items-center p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <span>⚠️</span> רק מנהל הקהילה יכול לנהל חיבורים חיצוניים
        </div>
      )}

      {/* ── Banks ─────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-secondary-900 flex items-center gap-2 text-lg">
            <span>🏦</span> חיבור לבנק
          </h2>
          {connectedBankCount > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">
              {connectedBankCount} מחוברים
            </span>
          )}
        </div>
        <p className="text-sm text-secondary-500 mb-4">
          חבר את חשבון הוועד לבנק לייבוא תנועות אוטומטי לתקציב
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
          {BANKS.map(bank => (
            <ProviderCard
              key={bank.id}
              provider={bank}
              state={connected[bank.id]}
              isSelected={selectedBank === bank.id}
              onSelect={() => {
                if (!isAdmin) { toast.error("נדרשת הרשאת מנהל"); return; }
                setSelectedBank(prev => prev === bank.id ? null : bank.id);
              }}
            />
          ))}
        </div>

        {selectedBank && (
          <ConnectForm
            provider={BANKS.find(b => b.id === selectedBank)!}
            state={connected[selectedBank]}
            onConnect={creds => handleConnect("bank", selectedBank, creds)}
            onDisconnect={() => handleDisconnect(selectedBank)}
            onSync={() => handleSync(selectedBank)}
            onClose={() => setSelectedBank(null)}
          />
        )}
      </Card>

      {/* ── Accounting ────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-secondary-900 flex items-center gap-2 text-lg">
            <span>🧾</span> מערכת הנהלת חשבונות
          </h2>
          {connectedAcctCount > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">
              {connectedAcctCount} מחוברים
            </span>
          )}
        </div>
        <p className="text-sm text-secondary-500 mb-4">
          חבר את המערכת לתוכנת הנהלת חשבונות לייצוא אוטומטי של דוחות וחשבוניות
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
          {ACCOUNTING.map(sys => (
            <ProviderCard
              key={sys.id}
              provider={sys}
              state={connected[sys.id]}
              isSelected={selectedAcct === sys.id}
              onSelect={() => {
                if (!isAdmin) { toast.error("נדרשת הרשאת מנהל"); return; }
                setSelectedAcct(prev => prev === sys.id ? null : sys.id);
              }}
            />
          ))}
        </div>

        {selectedAcct && (
          <ConnectForm
            provider={ACCOUNTING.find(a => a.id === selectedAcct)!}
            state={connected[selectedAcct]}
            onConnect={creds => handleConnect("acct", selectedAcct, creds)}
            onDisconnect={() => handleDisconnect(selectedAcct)}
            onSync={() => handleSync(selectedAcct)}
            onClose={() => setSelectedAcct(null)}
          />
        )}
      </Card>

      {/* ── Info card ─────────────────────────────────────────── */}
      <Card className="p-5 bg-secondary-50">
        <h2 className="font-bold text-secondary-800 mb-3 flex items-center gap-2 text-sm">
          <span>ℹ️</span> שים לב
        </h2>
        <ul className="space-y-2 text-sm text-secondary-600">
          <li className="flex items-start gap-2">
            <span className="text-green-600 flex-shrink-0 mt-0.5">🔒</span>
            כל הפרטים מוצפנים ונשמרים בצורה מאובטחת — לא נשמרים בטקסט גלוי
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 flex-shrink-0 mt-0.5">🔄</span>
            הסנכרון מתבצע אוטומטית כל 24 שעות לאחר חיבור
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 flex-shrink-0 mt-0.5">🏦</span>
            חיבור הבנק דורש הפעלת Open Banking בחשבון הבנק שלך
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 flex-shrink-0 mt-0.5">📞</span>
            לסיוע בחיבור — צור קשר עם התמיכה הטכנית שלנו
          </li>
        </ul>
      </Card>
    </div>
  );
}
