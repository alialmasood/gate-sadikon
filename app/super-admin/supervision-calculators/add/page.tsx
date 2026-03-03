"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { broadcastDataUpdate } from "@/lib/broadcast-data-update";

const BORDER_RADIUS = "rounded-xl";
const INPUT_CLASS =
  "w-full rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25";

function isValidUsername(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  return emailRegex.test(v) || (usernameRegex.test(v) && v.length >= 2);
}

function handleUsernameInput(val: string): string {
  return val.replace(/[^a-zA-Z0-9_.@]/g, "");
}

export default function AddSupervisionAccountPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [description, setDescription] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(handleUsernameInput(e.target.value));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("اسم المشرف مطلوب");
      return;
    }
    if (!isValidUsername(username)) {
      setError("الاسم المستخدم يقبل بريداً إلكترونياً أو اسم مستخدم بالإنجليزي (حروف، أرقام، _ أو .) فقط");
      return;
    }
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/supervision-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          password,
          confirmPassword,
          description: description.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "حدث خطأ");
        return;
      }
      broadcastDataUpdate();
      router.push("/super-admin/supervision-calculators");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-w-0 max-w-2xl space-y-6 sm:space-y-8" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold leading-tight text-[#1B1B1B] sm:text-2xl sm:leading-normal">
          إضافة حساب الإشراف والمراقبة
        </h1>
        <Link
          href="/super-admin/supervision-calculators"
          className="rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
        >
          رجوع
        </Link>
      </div>

      <div className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1B1B1B]">اسم المشرف *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم الكامل للمشرف"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1B1B1B]">الاسم المستخدم *</label>
            <input
              type="text"
              required
              value={username}
              onChange={handleUsernameChange}
              placeholder="بريد إلكتروني أو اسم مستخدم (أحرف إنجليزية فقط)"
              className={INPUT_CLASS}
              dir="ltr"
            />
            <p className="mt-1 text-xs text-[#5a5a5a]">أحرف إنجليزية وأرقام و _ و . و @ فقط</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1B1B1B]">كلمة المرور *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]"
                aria-label={showPassword ? "إخفاء" : "إظهار"}
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
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
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1B1B1B]">التأكد من كلمة المرور *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]"
                aria-label={showConfirmPassword ? "إخفاء" : "إظهار"}
                title={showConfirmPassword ? "إخفاء" : "إظهار"}
              >
                {showConfirmPassword ? (
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
            {password && confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-600">كلمتا المرور غير متطابقتين</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1B1B1B]">وصف المشرف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف أو ملاحظات حول المشرف"
              rows={4}
              className={INPUT_CLASS}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !name.trim() || !isValidUsername(username) || password.length < 8 || password !== confirmPassword}
              className={`${BORDER_RADIUS} flex-1 bg-[#1E6B3A] px-4 py-2.5 font-medium text-white transition hover:bg-[#175a2e] disabled:opacity-70`}
            >
              {submitting ? "جاري الحفظ..." : "حفظ"}
            </button>
            <Link
              href="/super-admin/supervision-calculators"
              className={`${BORDER_RADIUS} border border-[#d4cfc8] px-4 py-2.5 font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]`}
            >
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
