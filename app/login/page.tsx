"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import type React from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function safeCallbackUrl(raw: string | null): string {
  if (!raw || typeof raw !== "string") return "/";
  const trimmed = raw.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return "/";
}

function getRedirectByRole(role: string | undefined): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "PARLIAMENT_MEMBER":
      return "/member";
    case "ADMIN":
      return "/admin";
    case "USER":
      return "/user";
    case "AUDITOR":
      return "/auditor";
    case "COORDINATOR":
      return "/coordinator";
    case "RECEPTION":
      return "/reception";
    case "SORTING":
      return "/sorting";
    case "DOCUMENTATION":
      return "/documentation";
    case "SUPERVISION":
      return "/supervisor";
    default:
      return "/";
  }
}

function formatArabicDateTime(date: Date) {
  const d = new Intl.DateTimeFormat("ar-IQ", {
    day: "numeric",
    numberingSystem: "arab",
  }).format(date);
  const m = new Intl.DateTimeFormat("ar-IQ", { month: "long" }).format(date);
  const y = new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    numberingSystem: "arab",
  }).format(date);
  const t = new Intl.DateTimeFormat("ar-IQ", {
    hour: "numeric",
    minute: "2-digit",
    numberingSystem: "arab",
  }).format(date);
  return `${d} ${m} ${y} — ${t}`;
}

function OrnamentDivider() {
  return (
    <div className="flex w-full max-w-[180px] items-center gap-3 sm:max-w-[220px]" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-l from-[#C4A574]/80 to-transparent" />
      <svg width="12" height="12" viewBox="0 0 14 14" className="shrink-0 text-[#A4844A]">
        <path
          d="M7 1.2 L12.8 7 L7 12.8 L1.2 7 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        />
        <circle cx="7" cy="7" r="1.15" fill="currentColor" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-r from-[#C4A574]/80 to-transparent" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(formatArabicDateTime(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("بيانات الدخول غير صحيحة.");
        setLoading(false);
        return;
      }
      if (res?.ok) {
        const target = callbackUrl && callbackUrl !== "/" ? callbackUrl : "/";
        window.location.href = target;
        return;
      }
    } catch {
      setError("بيانات الدخول غير صحيحة.");
    }
    setLoading(false);
  }

  const showError = error || (errorParam === "CredentialsSignin" ? "بيانات الدخول غير صحيحة." : "");

  return (
    <div
      className="intro-portal relative flex min-h-dvh w-full flex-col overflow-x-hidden text-[#17202A]"
      style={{
        backgroundColor: "#F1EDE4",
        backgroundImage: [
          "radial-gradient(ellipse 80% 55% at 100% 0%, rgba(20, 48, 68, 0.16) 0%, transparent 58%)",
          "radial-gradient(ellipse 70% 50% at 0% 100%, rgba(164, 132, 74, 0.14) 0%, transparent 52%)",
          "linear-gradient(180deg, #E8EEF2 0%, #F1EDE4 42%, #EDE6D8 100%)",
        ].join(", "),
      }}
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.055] max-md:opacity-[0.035]" aria-hidden>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="login-geo" x="0" y="0" width="72" height="72" patternUnits="userSpaceOnUse">
              <circle cx="36" cy="36" r="14" fill="none" stroke="#143044" strokeWidth="0.6" />
              <rect x="26" y="26" width="20" height="20" fill="none" stroke="#A4844A" strokeWidth="0.45" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-geo)" />
        </svg>
      </div>

      <header
        className="relative z-20 flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 text-white sm:px-6 sm:py-3 lg:px-10"
        style={{
          background: "linear-gradient(180deg, #143044 0%, #0E2433 100%)",
          paddingTop: "max(0.65rem, env(safe-area-inset-top))",
        }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="hidden h-1.5 w-1.5 rounded-full bg-[#C4A574] sm:inline-block" aria-hidden />
          <p className="truncate text-[11px] font-medium text-white/80 sm:text-xs">
            جمهورية العراق · المنصة الإلكترونية الرسمية
          </p>
        </div>
        <p
          className="shrink-0 text-[11px] tabular-nums text-[#E8D7B0] sm:text-xs"
          aria-label="التاريخ والوقت"
          suppressHydrationWarning
        >
          {clock || "\u00a0"}
        </p>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <article
          className="intro-portal-card relative w-full max-w-[28rem] overflow-hidden rounded-[1.75rem] border border-white/70 px-5 py-7 shadow-[0_24px_80px_rgba(14,36,51,0.12)] sm:max-w-[32rem] sm:px-8 sm:py-9 md:px-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,253,249,0.94) 0%, rgba(252,248,241,0.9) 100%)",
            backdropFilter: "blur(18px)",
          }}
        >
          <div
            className="absolute inset-x-8 top-0 h-px bg-gradient-to-l from-transparent via-[#C4A574] to-transparent sm:inset-x-10"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{
              background: "linear-gradient(90deg, #0E2433 0%, #A4844A 50%, #0E2433 100%)",
            }}
            aria-hidden
          />

          <div className="flex flex-col items-center text-center">
            <div className="flex items-end justify-center gap-5 sm:gap-7">
              <div className="flex h-14 items-end sm:h-16 md:h-[4.5rem]">
                <Image
                  src="/iraq.png"
                  alt="شعار جمهورية العراق"
                  width={90}
                  height={90}
                  className="h-full w-auto object-contain object-bottom drop-shadow-[0_6px_16px_rgba(14,36,51,0.12)]"
                  sizes="(max-width: 640px) 56px, 72px"
                  priority
                />
              </div>
              <div className="flex h-14 items-end sm:h-16 md:h-[4.5rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/sadiqoon.png"
                  alt="شعار كتلة الصادقون"
                  width={90}
                  height={90}
                  className="h-full w-auto object-contain object-bottom drop-shadow-[0_6px_16px_rgba(14,36,51,0.12)]"
                />
              </div>
            </div>

            <p className="mt-4 font-heading text-[11px] font-medium text-[#8A7044] sm:mt-5 sm:text-xs">
              بوابة الصادقون
            </p>
            <h1 className="mt-1 text-[1.85rem] font-bold leading-[1.35] text-[#0E2433] sm:text-4xl">
              تسجيل الدخول
            </h1>
            <div className="mt-3 sm:mt-4">
              <OrnamentDivider />
            </div>
            <p className="mt-3 max-w-sm text-sm leading-7 text-[#5C6770] sm:mt-4 sm:text-[0.95rem] sm:leading-8">
              الرجاء إدخال بيانات الدخول المعتمدة للوصول إلى النظام.
            </p>
          </div>

          <form className="mt-6 flex flex-col gap-4 sm:mt-7 sm:gap-5" onSubmit={handleSubmit}>
            {showError && (
              <p
                className="rounded-xl border border-[#8A3B32]/20 bg-[#8A3B32]/10 px-3 py-2.5 text-sm text-[#6F2E28]"
                role="alert"
              >
                {showError}
              </p>
            )}

            <div className="text-right">
              <label htmlFor="email" className="font-heading mb-1.5 block text-sm font-medium text-[#143044]">
                البريد الإلكتروني أو اسم المستخدم
              </label>
              <input
                id="email"
                type="text"
                name="email"
                autoComplete="username"
                placeholder="بريد إلكتروني أو اسم المستخدم"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="min-h-12 w-full rounded-xl border border-[#143044]/10 bg-white/80 px-4 py-3 text-base text-[#17202A] outline-none placeholder:text-[#8A929A] focus:border-[#A4844A] focus:ring-2 focus:ring-[#A4844A]/20 disabled:opacity-70"
              />
            </div>

            <div className="text-right">
              <label htmlFor="password" className="font-heading mb-1.5 block text-sm font-medium text-[#143044]">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                  disabled={loading}
                  className="min-h-12 w-full rounded-xl border border-[#143044]/10 bg-white/80 py-3 pl-12 pr-4 text-base text-[#17202A] outline-none placeholder:text-[#8A929A] focus:border-[#A4844A] focus:ring-2 focus:ring-[#A4844A]/20 disabled:opacity-70"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#6B7380] hover:bg-[#143044]/6 hover:text-[#143044]"
                  tabIndex={-1}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {capsLockOn && (
                <p className="mt-1.5 text-xs text-[#8A7044]" role="status">
                  تنبيه: مفتاح Caps Lock مفعّل.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-6 text-[0.95rem] font-semibold text-white outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#C4A574] focus-visible:ring-offset-2 disabled:opacity-70 sm:min-h-[3.25rem]"
              style={{
                background: "linear-gradient(180deg, #1A3F52 0%, #0E2433 100%)",
                boxShadow: "0 14px 32px rgba(14, 36, 51, 0.22)",
              }}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  جاري التحقق...
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-sm sm:mt-6">
            <Link href="#" className="text-[#8A7044] underline-offset-4 hover:underline">
              نسيت كلمة المرور؟
            </Link>
            <span className="hidden h-3 w-px bg-[#143044]/15 sm:block" aria-hidden />
            <Link href="#" className="text-[#6B7380] underline-offset-4 hover:underline">
              سياسة الخصوصية
            </Link>
          </div>

          <div className="mt-5 text-center sm:mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#143044] underline-offset-4 hover:text-[#A4844A] hover:underline"
            >
              العودة إلى الصفحة الرئيسية
            </Link>
          </div>
        </article>
      </div>

      <footer
        className="relative z-10 px-4 text-center text-[11px] text-[#6B7380] sm:px-6 sm:text-xs"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        يتم تحديد الصلاحيات تلقائياً حسب نوع الحساب المعتمد
      </footer>
    </div>
  );
}
