"use client";

import { useState, useCallback } from "react";
import { signIn, getSession } from "next-auth/react";
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
    default:
      return "/";
  }
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        const session = await getSession();
        const role = (session?.user as { role?: string } | undefined)?.role;
        const defaultTarget = getRedirectByRole(role);
        const target = callbackUrl && callbackUrl !== "/" ? callbackUrl : defaultTarget;
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
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: "#F4F6F8",
        backgroundImage:
          "radial-gradient(ellipse 85% 70% at 50% 40%, rgba(201, 162, 39, 0.06) 0%, transparent 55%)",
      }}
      dir="rtl"
    >
      {/* إطار ذهبي خارجي — 1.5px + inner glow مؤسسي */}
      <div
        className="pointer-events-none absolute inset-3 rounded-2xl md:inset-6"
        style={{
          border: "1.5px solid rgba(184, 138, 26, 0.85)",
          boxShadow: "inset 0 0 0 1px rgba(176, 141, 87, 0.25)",
        }}
        aria-hidden
      >
        {[
          { top: 0, right: 0, width: "28px", height: "2px" },
          { top: 0, right: 0, width: "2px", height: "28px" },
          { top: 0, left: 0, width: "28px", height: "2px" },
          { top: 0, left: 0, width: "2px", height: "28px" },
          { bottom: 0, right: 0, width: "28px", height: "2px" },
          { bottom: 0, right: 0, width: "2px", height: "28px" },
          { bottom: 0, left: 0, width: "28px", height: "2px" },
          { bottom: 0, left: 0, width: "2px", height: "28px" },
        ].map((acc, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-[#8C6A12]/90"
            style={acc}
            aria-hidden
          />
        ))}
      </div>

      {/* محتوى عمودي centered — مثل الترحيب */}
      <div className="relative z-10 flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-8 md:py-12">
        {/* شريط الشعارات العلوي */}
        <header className="flex shrink-0 flex-col items-center pt-4 md:pt-6">
          <div className="flex items-end gap-[40px]">
            <div className="flex h-16 shrink-0 items-end md:h-20 lg:h-[90px]">
              <Image
                src="/iraq.png"
                alt="شعار جمهورية العراق"
                width={90}
                height={90}
                className="h-full w-auto object-contain object-bottom drop-shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                sizes="(max-width: 768px) 64px, 80px, 90px"
              />
            </div>
            <div className="flex h-16 shrink-0 items-end md:h-20 lg:h-[90px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sadiqoon.png"
                alt="شعار كتلة الصادقون"
                width={90}
                height={90}
                className="h-full w-auto object-contain object-bottom drop-shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              />
            </div>
          </div>
          {/* خط ذهبي فاصل — 240px × 3px gradient */}
          <div
            className="mt-4 h-[3px] w-48 rounded-full md:mt-5 md:w-60"
            style={{
              background: "linear-gradient(to right, #8C6A12, #C9A227, #8C6A12)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
            aria-hidden
          />
        </header>

        {/* عنوان رئيسي + وصف */}
        <h1 className="mt-8 text-center text-5xl font-black tracking-wide text-[#1B1B1B] md:mt-10 md:text-6xl">
          تسجيل الدخول
        </h1>
        <div className="mx-auto mt-3 h-0.5 w-24 rounded-full bg-[#C9A227]" aria-hidden />
        <p className="mt-4 max-w-md text-center text-sm text-[#5a5a5a] md:text-base">
          الرجاء إدخال بيانات الدخول المعتمدة للوصول إلى النظام.
        </p>

        {/* Card الفورم */}
        <article className="relative mt-8 w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#e8dfcf] bg-gradient-to-b from-white/95 to-[#f9f7f3] px-6 py-8 shadow-2xl shadow-black/10 backdrop-blur-md sm:px-8 sm:py-10">
          <div
            className="absolute left-0 right-0 top-0 h-1"
            style={{ background: "linear-gradient(90deg, #C9A227, #B08D57, #9C7B49)" }}
            aria-hidden
          />
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {showError && (
              <p className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-800" role="alert">
                {showError}
              </p>
            )}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1B1B1B]">
                البريد الإلكتروني أو الاسم المستخدم
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
                className="w-full rounded-xl border border-[#d9cbb4] bg-[#f6f3ed] px-4 py-3 text-base text-[#1B1B1B] placeholder:text-gray-500 focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25 disabled:opacity-70"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#1B1B1B]">
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
                  className="w-full rounded-xl border border-[#d9cbb4] bg-[#f6f3ed] py-3 pl-4 pr-12 text-base text-[#1B1B1B] placeholder:text-gray-500 focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25 disabled:opacity-70"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  tabIndex={-1}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {capsLockOn && (
                <p className="mt-1.5 text-xs text-amber-700" role="status">
                  تنبيه: مفتاح Caps Lock مفعّل.
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#C9A227] via-[#B08D57] to-[#9C7B49] text-lg font-semibold text-white shadow-lg shadow-[#B08D57]/25 transition-all duration-300 hover:from-[#B08D57] hover:to-[#8A6A3D] hover:shadow-xl hover:shadow-[#B08D57]/30 disabled:opacity-70 before:absolute before:inset-0 before:bg-gradient-to-t before:from-white/20 before:to-transparent before:opacity-40 before:content-[''] before:pointer-events-none"
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
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-sm">
            <Link href="#" className="text-[#B08D57] underline-offset-2 hover:underline">
              نسيت كلمة المرور؟
            </Link>
            <Link href="#" className="text-gray-500 underline-offset-2 hover:underline">
              سياسة الخصوصية
            </Link>
          </div>
        </article>

        <p className="mt-6 max-w-md text-center text-xs leading-relaxed text-gray-500">
          يتم تحديد الصلاحيات تلقائياً حسب نوع الحساب (Super Admin / Admin / User).
        </p>
      </div>
    </div>
  );
}
