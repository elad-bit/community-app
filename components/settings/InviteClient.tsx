"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface Member {
  user_id: string;
  role: string;
  residents: { name: string; phone?: string; avatar_url?: string } | null;
}

interface Props {
  tenant: Tenant | null;
  isAdmin: boolean;
  members: Member[];
}

export function InviteClient({ tenant, isAdmin, members }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  if (!tenant) {
    return (
      <Card className="p-8 text-center text-secondary-400">
        <p className="text-4xl mb-3">🏘️</p>
        <p>לא נמצאה קהילה מקושרת</p>
      </Card>
    );
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://your-app.com";

  const joinUrl    = `${origin}/onboarding?join=${tenant.slug}`;
  const joinCode   = tenant.slug;
  const whatsapp   = `https://wa.me/?text=${encodeURIComponent(`הצטרפו לקהילה "${tenant.name}" במערכת ניהול קהילה 2.0!\n\nלחצו על הקישור להרשמה:\n${joinUrl}\n\nקוד הקהילה: ${joinCode}`)}`;
  const mailtoLink = `mailto:?subject=${encodeURIComponent(`הזמנה לקהילה "${tenant.name}"`)}&body=${encodeURIComponent(`שלום,\n\nאתם מוזמנים להצטרף לקהילה "${tenant.name}" במערכת ניהול קהילה 2.0.\n\nלחצו על הקישור הבא להרשמה:\n${joinUrl}\n\nאו הזינו את קוד הקהילה: ${joinCode}\n\nבברכה,\nצוות ניהול הקהילה`)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success("הקישור הועתק ללוח");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("לא ניתן להעתיק — העתק ידנית");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(joinCode);
      toast.success("הקוד הועתק");
    } catch {
      toast.error("לא ניתן להעתיק");
    }
  }

  const admins   = members.filter(m => m.role === "admin");
  const residents = members.filter(m => m.role !== "admin");

  return (
    <div className="space-y-4">

      {/* ── Invite link ───────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="font-bold text-secondary-900 mb-1 flex items-center gap-2">
          <span>🔗</span> קישור הזמנה
        </h2>
        <p className="text-sm text-secondary-500 mb-4">
          שלח קישור זה לתושבים כדי שיצטרפו לקהילה. לאחר ההרשמה הם יתווספו אוטומטית.
        </p>

        {/* Link field */}
        <div className="flex gap-2 mb-3">
          <input
            readOnly
            value={joinUrl}
            dir="ltr"
            className="flex-1 min-w-0 text-sm font-mono bg-secondary-50 border border-secondary-200 rounded-xl px-3 py-2.5 text-secondary-700 focus:outline-none select-all"
          />
          <Button onClick={copyLink} size="lg" className="flex-shrink-0 gap-1.5">
            {copied ? "✓ הועתק" : "📋 העתק"}
          </Button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold rounded-xl py-3 px-4 transition-colors text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            שלח בוואטסאפ
          </a>
          <a
            href={mailtoLink}
            className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl py-3 px-4 transition-colors text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            שלח במייל
          </a>
        </div>
      </Card>

      {/* ── Join code ─────────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="font-bold text-secondary-900 mb-1 flex items-center gap-2">
          <span>🔑</span> קוד הצטרפות
        </h2>
        <p className="text-sm text-secondary-500 mb-4">
          תושבים יכולים להיכנס לדף ההרשמה ולהזין את הקוד הבא כדי להצטרף:
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-primary-50 border-2 border-primary-200 rounded-2xl px-5 py-4 text-center">
            <p className="text-3xl font-black tracking-widest text-primary-700 font-mono">{joinCode}</p>
            <p className="text-xs text-primary-500 mt-1">קוד הקהילה</p>
          </div>
          <Button variant="outline" size="lg" onClick={copyCode} className="flex-shrink-0">
            📋 העתק
          </Button>
        </div>
      </Card>

      {/* ── Instructions ──────────────────────────────────────── */}
      <Card className="p-5 bg-secondary-50">
        <h2 className="font-bold text-secondary-900 mb-3 flex items-center gap-2 text-sm">
          <span>📖</span> איך זה עובד?
        </h2>
        <div className="space-y-2.5">
          {[
            { n: "1", text: "שלח את הקישור או הקוד לתושב" },
            { n: "2", text: 'התושב נכנס לקישור ולוחץ "הצטרף לקהילה"' },
            { n: "3", text: "הוא מזין את הקוד ונרשם עם חשבון Google" },
            { n: "4", text: "הוא מתווסף אוטומטית לרשימת התושבים — ולא יצטרך לבחור קהילה שוב" },
          ].map(s => (
            <div key={s.n} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {s.n}
              </div>
              <p className="text-sm text-secondary-700">{s.text}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Current members ───────────────────────────────────── */}
      {isAdmin && (
        <Card className="p-5">
          <h2 className="font-bold text-secondary-900 mb-4 flex items-center gap-2">
            <span>👥</span> חברי הקהילה ({members.length})
          </h2>

          {admins.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wide mb-2">מנהלים</p>
              <div className="space-y-2">
                {admins.map((m, i) => (
                  <MemberRow key={i} member={m} />
                ))}
              </div>
            </div>
          )}

          {residents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wide mb-2">תושבים</p>
              <div className="space-y-2">
                {residents.map((m, i) => (
                  <MemberRow key={i} member={m} />
                ))}
              </div>
            </div>
          )}

          {members.length === 0 && (
            <p className="text-sm text-secondary-400 text-center py-6">
              אין חברים עדיין — שלח הזמנות!
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  const name = member.residents?.name ?? "—";
  const initial = name.charAt(0);
  return (
    <div className="flex items-center gap-3 p-2.5 bg-secondary-50 rounded-xl">
      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden">
        {member.residents?.avatar_url
          ? <img src={member.residents.avatar_url} alt={name} className="w-full h-full object-cover" />
          : initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-secondary-900 truncate">{name}</p>
        {member.residents?.phone && (
          <p className="text-xs text-secondary-400" dir="ltr">{member.residents.phone}</p>
        )}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
        member.role === "admin"
          ? "bg-purple-100 text-purple-700"
          : "bg-blue-100 text-blue-700"
      }`}>
        {member.role === "admin" ? "מנהל" : "תושב"}
      </span>
    </div>
  );
}
