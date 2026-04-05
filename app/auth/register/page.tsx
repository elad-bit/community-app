"use client";

import Link from "next/link";
import { AuthForm } from "@/components/ui/AuthForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-primary-600">ניהול קהילה 2.0</h1>
          </Link>
          <p className="text-secondary-500 text-sm mt-2">הצטרף לקהילה</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-8">
          <h2 className="text-xl font-bold text-secondary-900 mb-2 text-center">
            יצירת חשבון
          </h2>
          <p className="text-secondary-400 text-sm text-center mb-6">
            בחר איך להירשם
          </p>
          <AuthForm mode="register" />
        </div>

        <p className="text-center text-secondary-500 text-sm mt-6">
          כבר יש לך חשבון?{" "}
          <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">
            התחבר
          </Link>
        </p>
      </div>
    </div>
  );
}
