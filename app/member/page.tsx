"use client";

import { useState, useEffect, useCallback } from "react";

type MemberProfile = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  enabled: boolean;
  createdAt: string;
};

export default function MemberPage() {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/member/profile", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setProfile(data);
      } else {
        setError(data.error || "فشل تحميل البيانات");
      }
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const displayName = profile?.name || profile?.email || "عضو مجلس النواب";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6" dir="rtl">
      {/* الترويسة */}
      <div>
        <h2 className="text-base font-semibold text-[#1B1B1B] sm:text-lg">
          مرحباً، {loading ? "…" : displayName}
        </h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">
          لوحة تحكم عضو مجلس النواب العراقي — بوابة الصادقون
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* بطاقة الملف الشخصي */}
      {profile && (
        <section className="rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-[#1B1B1B]">معلومات الحساب</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[#1e3a5f]/20 bg-[#1e3a5f]/5 p-4">
              <p className="text-xs font-medium text-[#5a5a5a]">الاسم</p>
              <p className="mt-1 text-[#1B1B1B] font-medium">{profile.name || "—"}</p>
            </div>
            <div className="rounded-xl border border-[#1e3a5f]/20 bg-[#1e3a5f]/5 p-4">
              <p className="text-xs font-medium text-[#5a5a5a]">البريد الإلكتروني / اسم المستخدم</p>
              <p className="mt-1 text-[#1B1B1B] font-medium" dir="ltr">{profile.email}</p>
            </div>
            <div className="rounded-xl border border-[#1e3a5f]/20 bg-[#1e3a5f]/5 p-4">
              <p className="text-xs font-medium text-[#5a5a5a]">رقم الهاتف</p>
              <p className="mt-1 text-[#1B1B1B] font-medium" dir="ltr">{profile.phone || "—"}</p>
            </div>
          </div>
        </section>
      )}

      {/* التوجيهات */}
      <section className="rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 text-base font-semibold text-[#1B1B1B]">التوجيهات والتعليمات</h3>
        <p className="mt-1 text-sm text-[#5a5a5a]">
          التوجيهات والتعليمات الموجهة لأعضاء مجلس النواب.
        </p>
        <div className="mt-4 rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/50 p-6 text-center">
          <p className="text-[#5a5a5a]">قسم التوجيهات — قيد التطوير</p>
        </div>
      </section>

      {/* بطاقة إضافية للتوسع المستقبلي */}
      <section className="rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 text-base font-semibold text-[#1B1B1B]">خدمات إضافية</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#d4cfc8]/80 bg-[#f0f4f8]/50 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e3a5f]/15 text-[#1e3a5f]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-[#1B1B1B]">المستندات والوثائق</p>
                <p className="text-xs text-[#5a5a5a]">قريباً</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#d4cfc8]/80 bg-[#f0f4f8]/50 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e3a5f]/15 text-[#1e3a5f]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-[#1B1B1B]">الاجتماعات والجلسات</p>
                <p className="text-xs text-[#5a5a5a]">قريباً</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
