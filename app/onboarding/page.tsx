"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Step = "choice" | "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // יצירת קהילה
  const [createForm, setCreateForm] = useState({ name: "", city: "", slug: "" });

  // הצטרפות לקהילה קיימת
  const [joinCode, setJoinCode] = useState("");

  function generateSlug(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]/g, "")
      || "community";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) { setError("שם הקהילה הוא שדה חובה"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          city: createForm.city.trim(),
          slug: createForm.slug || generateSlug(createForm.name),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "שגיאה ביצירת קהילה");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) { setError("נא להזין קוד הצטרפות"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/tenants/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: joinCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "שגיאה בהצטרפות");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* לוגו */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">ק</span>
          </div>
          <h1 className="text-2xl font-bold text-secondary-900">ניהול קהילה 2.0</h1>
          <p className="text-secondary-500 text-sm mt-1">ברוך הבא! בוא נתחיל</p>
        </div>

        {/* בחירה */}
        {step === "choice" && (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-secondary-800 text-center mb-2">
              מה תרצה לעשות?
            </h2>
            <button
              onClick={() => setStep("create")}
              className="w-full flex items-center gap-4 p-4 border-2 border-secondary-100 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-all group"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-primary-200 transition-colors">
                🏘️
              </div>
              <div className="text-right">
                <p className="font-semibold text-secondary-900">יצירת קהילה חדשה</p>
                <p className="text-sm text-secondary-500">אני מנהל קהילה ורוצה להקים מערכת</p>
              </div>
            </button>

            <button
              onClick={() => setStep("join")}
              className="w-full flex items-center gap-4 p-4 border-2 border-secondary-100 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-200 transition-colors">
                🔗
              </div>
              <div className="text-right">
                <p className="font-semibold text-secondary-900">הצטרפות לקהילה קיימת</p>
                <p className="text-sm text-secondary-500">קיבלתי קוד הצטרפות מהמנהל</p>
              </div>
            </button>
          </div>
        )}

        {/* יצירת קהילה */}
        {step === "create" && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <button
              onClick={() => { setStep("choice"); setError(null); }}
              className="flex items-center gap-1 text-sm text-secondary-400 hover:text-secondary-600 mb-4 transition-colors"
            >
              <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              חזרה
            </button>

            <h2 className="text-lg font-semibold text-secondary-900 mb-4">יצירת קהילה חדשה</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  שם הקהילה / היישוב <span className="text-red-500">*</span>
                </label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({
                    ...createForm,
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                  })}
                  placeholder='יישוב נוף הגליל'
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">עיר / אזור</label>
                <Input
                  value={createForm.city}
                  onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                  placeholder="גליל מערבי"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  קוד ייחודי (לינק הצטרפות)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-secondary-400 whitespace-nowrap">kehila.app/</span>
                  <Input
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                    placeholder="nof-hagalil"
                    dir="ltr"
                  />
                </div>
                <p className="text-xs text-secondary-400 mt-1">זה הקוד שתושבים ישתמשו בו להצטרף</p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
              )}

              <Button type="submit" className="w-full" isLoading={loading}>
                צור קהילה והתחל
              </Button>
            </form>
          </div>
        )}

        {/* הצטרפות */}
        {step === "join" && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <button
              onClick={() => { setStep("choice"); setError(null); }}
              className="flex items-center gap-1 text-sm text-secondary-400 hover:text-secondary-600 mb-4 transition-colors"
            >
              <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              חזרה
            </button>

            <h2 className="text-lg font-semibold text-secondary-900 mb-4">הצטרפות לקהילה</h2>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  קוד הקהילה
                </label>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="nof-hagalil"
                  dir="ltr"
                  required
                />
                <p className="text-xs text-secondary-400 mt-1">
                  קבל את הקוד מהמנהל של הקהילה שלך
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
              )}

              <Button type="submit" className="w-full" isLoading={loading}>
                הצטרף לקהילה
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
