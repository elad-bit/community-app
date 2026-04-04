"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  logo_url?: string | null;
}

interface Props {
  tenant: Tenant | null;
  isAdmin: boolean;
}

export function CommunitySettingsClient({ tenant, isAdmin }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({
    name:     tenant?.name     ?? "",
    slug:     tenant?.slug     ?? "",
    city:     tenant?.city     ?? "",
    logo_url: tenant?.logo_url ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(tenant?.logo_url ?? "");

  if (!tenant) {
    return (
      <Card className="p-8 text-center text-secondary-400">
        <p className="text-4xl mb-3">🏘️</p>
        <p className="text-base font-medium text-secondary-600">לא נמצאה קהילה מקושרת לחשבון</p>
      </Card>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("שם הקהילה חובה"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenant!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     form.name.trim(),
          slug:     form.slug.trim().toLowerCase(),
          city:     form.city.trim() || null,
          logo_url: form.logo_url.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("פרטי הקהילה עודכנו בהצלחה");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {!isAdmin && (
        <div className="flex gap-2 items-center p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <span>⚠️</span> רק מנהל הקהילה יכול לערוך הגדרות אלו
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Logo */}
        <Card className="p-5">
          <h2 className="font-bold text-secondary-900 mb-4 flex items-center gap-2">
            <span>🏘️</span> לוגו הקהילה
          </h2>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="w-20 h-20 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center text-4xl font-bold flex-shrink-0 overflow-hidden border-2 border-primary-200">
              {logoPreview ? (
                <img src={logoPreview} alt="לוגו" className="w-full h-full object-cover" onError={() => setLogoPreview("")} />
              ) : (
                form.name.charAt(0) || "ק"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-secondary-700 mb-1">כתובת URL לתמונה</label>
              <Input
                value={form.logo_url}
                onChange={e => { setForm({ ...form, logo_url: e.target.value }); setLogoPreview(e.target.value); }}
                placeholder="https://example.com/logo.png"
                disabled={!isAdmin}
                className="text-sm"
              />
              <p className="text-xs text-secondary-400 mt-1">העלה תמונה לשירות כמו Imgur ולאחר מכן הדבק את הקישור</p>
            </div>
          </div>
        </Card>

        {/* Details */}
        <Card className="p-5">
          <h2 className="font-bold text-secondary-900 mb-4 flex items-center gap-2">
            <span>📋</span> פרטי הקהילה
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                שם הקהילה <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="ישוב בכפרי"
                disabled={!isAdmin}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">כינוי (slug)</label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary-400 font-mono select-none">
                    /join/
                  </span>
                  <Input
                    value={form.slug}
                    onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="yeshuv-bkfari"
                    disabled={!isAdmin}
                    className="pr-12 font-mono text-sm"
                    dir="ltr"
                  />
                </div>
                <p className="text-xs text-secondary-400 mt-1">אותיות אנגלית, מספרים ומקף בלבד</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">עיר / יישוב</label>
                <Input
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  placeholder="רמת גן"
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Join info */}
        <Card className="p-5 bg-primary-50 border-primary-200">
          <h2 className="font-bold text-primary-900 mb-2 flex items-center gap-2 text-sm">
            <span>🔗</span> קוד הצטרפות
          </h2>
          <p className="text-sm text-primary-700 mb-2">
            תושבים יכולים להצטרף לקהילה שלך עם הקוד:
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-white text-primary-800 font-mono text-sm px-3 py-1.5 rounded-lg border border-primary-200 flex-1">
              {form.slug || tenant.slug}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(form.slug || tenant.slug);
                toast.success("הקוד הועתק");
              }}
            >
              העתק
            </Button>
          </div>
        </Card>

        {isAdmin && (
          <div className="flex justify-end pt-1">
            <Button type="submit" size="lg" isLoading={loading} className="w-full sm:w-auto">
              💾 שמור שינויים
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
