"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "facebook";

interface UpdateProfileParams {
  fullName?: string;
  avatarUrl?: string;
}

/** כניסה עם Google או Facebook */
export async function signInWithOAuth(provider: OAuthProvider) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams:
        provider === "google"
          ? { access_type: "offline", prompt: "consent" }
          : {},
    },
  });
  return { data, error };
}

/** כניסה עם אימייל וסיסמה */
export async function signInWithEmail(email: string, password: string) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/** הרשמה עם אימייל וסיסמה */
export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

/** שליחת קוד OTP למספר טלפון */
export async function sendPhoneOTP(phone: string) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOtp({ phone });
  return { data, error };
}

/** אימות קוד OTP לטלפון */
export async function verifyPhoneOTP(phone: string, token: string) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  return { data, error };
}

/** שכחתי סיסמה — שליחת מייל איפוס */
export async function resetPassword(email: string) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  return { data, error };
}

/** התנתקות */
export async function signOut() {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

/** קבלת המשתמש הנוכחי */
export async function getCurrentUser() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

/** עדכון פרופיל משתמש */
export async function updateProfile({ fullName, avatarUrl }: UpdateProfileParams) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      avatar_url: avatarUrl,
    },
  });
  return { data, error };
}
