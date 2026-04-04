"use client";

import { useState } from "react";
import { clsx } from "clsx";

const countries = [
  { code: "+972", flag: "🇮🇱", name: "ישראל" },
  { code: "+1",   flag: "🇺🇸", name: "ארה״ב" },
  { code: "+44",  flag: "🇬🇧", name: "בריטניה" },
  { code: "+49",  flag: "🇩🇪", name: "גרמניה" },
  { code: "+33",  flag: "🇫🇷", name: "צרפת" },
  { code: "+971", flag: "🇦🇪", name: "איחוד האמירויות" },
  { code: "+970", flag: "🇵🇸", name: "פלסטין" },
  { code: "+962", flag: "🇯🇴", name: "ירדן" },
];

interface PhoneInputProps {
  label?: string;
  error?: string;
  hint?: string;
  onChange: (fullPhone: string) => void;
  required?: boolean;
}

export function PhoneInput({ label, error, hint, onChange, required }: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState("+972");
  const [number, setNumber] = useState("");
  const [open, setOpen] = useState(false);

  const selected = countries.find((c) => c.code === countryCode) ?? countries[0];

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // רק ספרות
    const raw = e.target.value.replace(/\D/g, "");
    setNumber(raw);

    // מסיר אפס מוביל לפני חיבור הקידומת
    const withoutLeadingZero = raw.startsWith("0") ? raw.slice(1) : raw;
    onChange(countryCode + withoutLeadingZero);
  };

  const handleCountrySelect = (code: string) => {
    setCountryCode(code);
    const withoutLeadingZero = number.startsWith("0") ? number.slice(1) : number;
    onChange(code + withoutLeadingZero);
    setOpen(false);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-secondary-700 mb-1">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}

      <div className="relative flex gap-2">
        {/* Country selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium bg-white transition-colors whitespace-nowrap",
              error
                ? "border-red-400"
                : "border-secondary-200 hover:border-secondary-300"
            )}
          >
            <span className="text-base">{selected.flag}</span>
            <span className="text-secondary-700" dir="ltr">{selected.code}</span>
            <svg
              className={`h-3.5 w-3.5 text-secondary-400 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute top-full mt-1 right-0 w-44 bg-white rounded-xl shadow-lg border border-secondary-100 py-1 z-50 max-h-56 overflow-y-auto">
              {countries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c.code)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary-50 transition-colors text-right",
                    c.code === countryCode && "bg-primary-50 text-primary-700"
                  )}
                >
                  <span>{c.flag}</span>
                  <span className="flex-1">{c.name}</span>
                  <span className="text-secondary-400 text-xs" dir="ltr">{c.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone number */}
        <input
          type="tel"
          inputMode="numeric"
          placeholder="0501234567"
          value={number}
          onChange={handleNumberChange}
          required={required}
          dir="ltr"
          className={clsx(
            "flex-1 px-4 py-2.5 rounded-xl border text-sm text-secondary-900 placeholder:text-secondary-400",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
            "transition-colors duration-150",
            error
              ? "border-red-400 bg-red-50"
              : "border-secondary-200 bg-white hover:border-secondary-300"
          )}
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-secondary-400">{hint}</p>}
    </div>
  );
}
