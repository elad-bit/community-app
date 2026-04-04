"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

interface Resident {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  role: string;
  avatar_url?: string | null;
}

interface Props {
  resident: Resident | null;
  email: string;
  authProvider: string;
}

const roleLabel = (role: string) => role === "admin" ? "מנהל קהילה" : "תושב";

export function ProfileSettingsClient({ resident, email, authProvider }: Props) {
  const toast = useToast();

  const [profile, setProfile] = useState({
    name:       resident?.name       ?? "",
    avatar_url: resident?.avatar_url ?? "",
  });
  const [avatarPreview, setAvatarPreview] = useState(resident?.avatar_url ?? "");
  const [profileLoading, setProfileLoading] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading]   = useState(false);
  const [pwVisible, setPwVisible]   = useState(false);
  const isGoogleUser = authProvider === "google";

  /* ── Save profile ─────────────────────────────────────────────── */
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.name.trim()) { toast.error("שם לא יכול להיות ריק"); return; }
    setProfileLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name, avatar_url: profile.avatar_url || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("הפרופיל עודכן בהצלחה");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setProfileLoading(false);
    }
  }

  /* ── Change password ──────────────────────────────────────────── */
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next.length < 8) { toast.error("הסיסמה חייבת להכיל לפחות 8 תווים"); return; }
    if (pw.next !== pw.confirm) { toast.error("הסיסמאות אינן תואמות"); return; }
    setPwLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw.next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("הסיסמה שונתה בהצלחה");
      setPw({ current: "", next: "", confirm: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשינוי סיסמה");
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Identity ────────────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="font-bold text-secondary-900 mb-4 flex items-center gap-2">
          <span>👤</span> זהות ופרטים
        </h2>
        <div className="flex items-center gap-4 mb-5 p-4 bg-secondary-50 rounded-2xl flex-wrap">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold flex-shrink-0 overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="תמונה" className="w-full h-full object-cover" onError={() => setAvatarPreview("")} />
            ) : (
              profile.name.charAt(0) || "?"
            )}
          </div>
          <div>
            <p className="font-semibold text-secondary-900">{profile.name || "—"}</p>
            <p className="text-sm text-secondary-500">{email}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
              resident?.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
            }`}>
              {roleLabel(resident?.role ?? "resident")}
            </span>
          </div>
          {isGoogleUser && (
            <span className="mr-auto text-xs bg-white border border-secondary-200 text-secondary-500 px-2 py-1 rounded-lg flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              שם מלא <span className="text-red-500">*</span>
            </label>
            <Input
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              placeholder="שם מלא"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">תמונת פרופיל (URL)</label>
            <Input
              value={profile.avatar_url}
              onChange={e => { setProfile({ ...profile, avatar_url: e.target.value }); setAvatarPreview(e.target.value); }}
              placeholder="https://example.com/photo.jpg"
              dir="ltr"
              className="text-sm"
            />
            <p className="text-xs text-secondary-400 mt-1">העלה תמונה לשירות כמו Imgur ולאחר מכן הדבק את הקישור</p>
          </div>
          <div className="flex items-center gap-2 p-3 bg-secondary-50 rounded-xl text-sm text-secondary-600">
            <span>📧</span>
            <span>כתובת מייל: <strong>{email}</strong> (לא ניתן לשינוי)</span>
          </div>
          <Button type="submit" size="lg" isLoading={profileLoading} className="w-full sm:w-auto">
            💾 שמור פרופיל
          </Button>
        </form>
      </Card>

      {/* ── Password ────────────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="font-bold text-secondary-900 mb-1 flex items-center gap-2">
          <span>🔒</span> שינוי סיסמה
        </h2>

        {isGoogleUser ? (
          <div className="flex gap-2 items-start p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 mt-3">
            <span className="text-lg flex-shrink-0">ℹ️</span>
            <div>
              <p className="font-medium">חשבון Google</p>
              <p className="mt-0.5">התחברת באמצעות Google — שינוי סיסמה מתבצע דרך חשבון Google שלך.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">סיסמה חדשה</label>
              <div className="relative">
                <Input
                  type={pwVisible ? "text" : "password"}
                  value={pw.next}
                  onChange={e => setPw({ ...pw, next: e.target.value })}
                  placeholder="לפחות 8 תווים"
                  required
                  minLength={8}
                  className="pl-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setPwVisible(!pwVisible)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                >
                  {pwVisible
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
              {pw.next.length > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      pw.next.length >= [8, 12, 16, 20][i]
                        ? ["bg-red-400", "bg-amber-400", "bg-green-400", "bg-green-600"][i]
                        : "bg-secondary-200"
                    }`} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">אישור סיסמה</label>
              <Input
                type={pwVisible ? "text" : "password"}
                value={pw.confirm}
                onChange={e => setPw({ ...pw, confirm: e.target.value })}
                placeholder="הזן שוב את הסיסמה החדשה"
                required
                dir="ltr"
              />
              {pw.confirm && pw.next !== pw.confirm && (
                <p className="text-xs text-red-500 mt-1">הסיסמאות אינן תואמות</p>
              )}
              {pw.confirm && pw.next === pw.confirm && pw.next.length >= 8 && (
                <p className="text-xs text-green-600 mt-1">✓ הסיסמאות תואמות</p>
              )}
            </div>
            <Button
              type="submit"
              size="lg"
              isLoading={pwLoading}
              className="w-full sm:w-auto"
              disabled={pw.next !== pw.confirm || pw.next.length < 8}
            >
              🔑 שנה סיסמה
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
