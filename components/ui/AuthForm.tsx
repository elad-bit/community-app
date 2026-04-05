"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithOAuth,
  signInWithEmail,
  signUpWithEmail,
  sendPhoneOTP,
  verifyPhoneOTP,
  resetPassword,
} from "@/services/auth";

type Tab = "social" | "email" | "phone";
type Mode = "login" | "register";

interface AuthFormProps {
  mode?: Mode;
}

export function AuthForm({ mode = "login" }: AuthFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("social");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Email form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showReset, setShowReset] = useState(false);

  // Phone form
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Social
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const label = mode === "register" ? "הרשמה" : "כניסה";

  const handleOAuth = async (provider: "google" | "facebook") => {
    setError(null);
    setSocialLoading(provider);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) setError("שגיאה בהתחברות. נסה שוב.");
    } catch {
      setError("שגיאה בהתחברות. נסה שוב.");
      setSocialLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email || (!showReset && !password)) return;
    setLoading(true);

    try {
      if (showReset) {
        const { error } = await resetPassword(email);
        if (error) setError("שגיאה בשליחת המייל. בדוק את הכתובת ונסה שוב.");
        else setSuccess("קישור לאיפוס סיסמה נשלח למייל שלך!");
      } else if (mode === "login") {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) setError("אימייל או סיסמה שגויים.");
          else setError("שגיאה בכניסה. נסה שוב.");
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        if (!fullName.trim()) { setError("שם מלא הוא שדה חובה."); setLoading(false); return; }
        if (password.length < 6) { setError("סיסמה חייבת להכיל לפחות 6 תווים."); setLoading(false); return; }
        const { error } = await signUpWithEmail(email, password, fullName);
        if (error) setError("שגיאה בהרשמה: " + error.message);
        else setSuccess("נשלח אליך מייל לאימות החשבון! בדוק את תיבת הדואר.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone) return;
    // Format phone for Israel
    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) formattedPhone = "+972" + formattedPhone.slice(1);
    else if (!formattedPhone.startsWith("+")) formattedPhone = "+972" + formattedPhone;
    setLoading(true);
    try {
      const { error } = await sendPhoneOTP(formattedPhone);
      if (error) setError("שגיאה בשליחת SMS. בדוק את מספר הטלפון.");
      else { setOtpSent(true); setSuccess("קוד נשלח ל-" + formattedPhone); }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) formattedPhone = "+972" + formattedPhone.slice(1);
    else if (!formattedPhone.startsWith("+")) formattedPhone = "+972" + formattedPhone;
    setLoading(true);
    try {
      const { error } = await verifyPhoneOTP(formattedPhone, otp);
      if (error) setError("קוד שגוי. נסה שוב.");
      else { router.push("/dashboard"); router.refresh(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex rounded-xl border border-secondary-200 overflow-hidden text-sm font-medium">
        {(["social", "email", "phone"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setError(null); setSuccess(null); }}
            className={`flex-1 py-2 transition-colors ${
              tab === t
                ? "bg-primary-600 text-white"
                : "bg-white text-secondary-500 hover:bg-secondary-50"
            }`}
          >
            {t === "social" ? "רשתות חברתיות" : t === "email" ? "אימייל" : "טלפון"}
          </button>
        ))}
      </div>

      {/* Error / Success */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">{success}</div>
      )}

      {/* Social Tab */}
      {tab === "social" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-secondary-200 rounded-xl text-secondary-700 font-medium text-sm hover:bg-secondary-50 hover:border-secondary-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {socialLoading === "google" ? <Spinner /> : <GoogleIcon />}
            {label} עם Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("facebook")}
            disabled={socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1877F2] rounded-xl text-white font-medium text-sm hover:bg-[#166FE5] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {socialLoading === "facebook" ? <Spinner white /> : <FacebookIcon />}
            {label} עם Facebook
          </button>
        </div>
      )}

      {/* Email Tab */}
      {tab === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-3" dir="rtl">
          {mode === "register" && !showReset && (
            <input
              type="text"
              placeholder="שם מלא"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border border-secondary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              required
            />
          )}
          <input
            type="email"
            placeholder="כתובת אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-secondary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            required
          />
          {!showReset && (
            <input
              type="password"
              placeholder="סיסמה (לפחות 6 תווים)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-secondary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              required
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 text-white font-medium text-sm rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? "טוען..." : showReset ? "שלח קישור איפוס" : label}
          </button>
          {mode === "login" && (
            <button
              type="button"
              onClick={() => { setShowReset(!showReset); setError(null); setSuccess(null); }}
              className="w-full text-center text-xs text-secondary-400 hover:text-primary-600 transition-colors"
            >
              {showReset ? "חזור להתחברות" : "שכחתי סיסמה"}
            </button>
          )}
        </form>
      )}

      {/* Phone Tab */}
      {tab === "phone" && (
        <div className="space-y-3" dir="rtl">
          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-3">
              <div className="text-xs text-secondary-500 text-center">הזן מספר טלפון ישראלי (05x-xxxxxxx)</div>
              <input
                type="tel"
                placeholder="050-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-secondary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-left"
                dir="ltr"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary-600 text-white font-medium text-sm rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? "שולח..." : "שלח קוד SMS"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-3">
              <div className="text-xs text-secondary-500 text-center">הזן את הקוד שנשלח לטלפון</div>
              <input
                type="text"
                placeholder="קוד 6 ספרות"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="w-full px-4 py-3 border border-secondary-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-center tracking-widest text-lg"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary-600 text-white font-medium text-sm rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? "מאמת..." : "אמת קוד"}
              </button>
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtp(""); setError(null); setSuccess(null); }}
                className="w-full text-center text-xs text-secondary-400 hover:text-primary-600"
              >
                שנה מספר טלפון
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function Spinner({ white }: { white?: boolean }) {
  return (
    <svg className={`animate-spin h-5 w-5 ${white ? "text-white" : "text-secondary-400"}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
