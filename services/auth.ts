"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "facebook";

interface UpdateProfileParams {
  fullName?: string;
  avatarUrl?: string;
}

/**
 * כניסה עם Google או Facebook
 */
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

/**
 * התנתקות
 */
export async function signOut() {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * קבלת המשתמש הנוכחי
 */
export async function getCurrentUser() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

/**
 * עדכון פרופיל משתמש
 */
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
