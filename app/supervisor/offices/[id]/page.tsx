"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type OfficeDetail = {
  office: {
    id: string;
    name: string;
    location: string | null;
    managerName: string | null;
    managerPhone: string | null;
  };
  sections: { name: string; users: { id: string; name: string | null; email: string }[] }[];
  stats: {
    totalTransactions: number;
    todayCount: number;
    monthCount: number;
    yearCount: number;
    pendingCount: number;
    doneCount: number;
    overdueCount: number;
  };
};

export default function SupervisorOfficeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<OfficeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOffice = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!id) return;
      if (!opts?.silent) setLoading(true);
      try {
        const r = await fetch(`/api/supervisor/offices/${id}`);
        if (!r.ok) throw new Error("فشل التحميل");
        const res = await r.json();
        setData(res);
        setError("");
      } catch {
        if (!opts?.silent) setError("تعذر تحميل بيانات المكتب");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadOffice();
  }, [loadOffice]);

  useAutoRefresh(() => loadOffice({ silent: true }));

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8" dir="rtl">
        <div className="animate-pulse rounded-xl border border-[#c9d6e3] bg-white p-8">
          <div className="h-6 w-1/3 rounded bg-[#e8ecf0]" />
          <div className="mt-4 h-4 w-1/2 rounded bg-[#e8ecf0]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800">{error || "المكتب غير موجود"}</p>
          <Link href="/supervisor/offices" className="mt-4 inline-block text-[#1E6B3A] font-medium hover:underline">
            العودة لقائمة المكاتب
          </Link>
        </div>
      </div>
    );
  }

  const { office, sections, stats } = data;

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      {/* ترويسة رسمية */}
      <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm">
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #1E6B3A, #B08D57)" }}
          aria-hidden
        />
        <div className="px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="min-w-0 flex-1 text-xl font-bold text-[#1e3a5f] sm:text-2xl">{office.name}</h1>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#1E6B3A]/20 bg-gradient-to-br from-[#1E6B3A]/10 to-[#B08D57]/5 sm:hidden">
                  <svg className="h-6 w-6 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-[#5a6c7d]">
                مدير/مسؤول المكتب: <span className="font-medium text-[#1B1B1B]">{office.managerName || "—"}</span>
              </p>
              <p className="text-sm text-[#5a6c7d]">
                العنوان: <span className="text-[#1B1B1B]">{office.location || "—"}</span>
              </p>
            </div>
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center self-start rounded-xl border border-[#1E6B3A]/20 bg-gradient-to-br from-[#1E6B3A]/10 to-[#B08D57]/5 sm:flex sm:self-center">
              <svg className="h-7 w-7 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "إجمالي المعاملات", value: stats.totalTransactions, icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
          { label: "اليوم", value: stats.todayCount, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          { label: "هذا الشهر", value: stats.monthCount, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          { label: "هذه السنة", value: stats.yearCount, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#c9d6e3] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1E6B3A]/20 bg-[#1E6B3A]/5">
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5a6c7d]">{s.label}</p>
                <p className="text-xl font-bold text-[#1e3a5f]">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* حالة المعاملات */}
        <div className="rounded-xl border border-[#c9d6e3] bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-[#1e3a5f]">حالة المعاملات</h3>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-[#5a6c7d]">قيد التنفيذ</span>
              <span className="font-medium text-[#1B1B1B]">{stats.pendingCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5a6c7d]">منجزة</span>
              <span className="font-medium text-[#1E6B3A]">{stats.doneCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5a6c7d]">متأخرة</span>
              <span className="font-medium text-amber-600">{stats.overdueCount}</span>
            </div>
          </div>
        </div>

        {/* الأقسام والموظفون */}
        <div className="rounded-xl border border-[#c9d6e3] bg-white p-4 shadow-sm sm:p-5">
          <h3 className="font-semibold text-[#1e3a5f]">أقسام المكتب والموظفون</h3>
          {sections.length === 0 ? (
            <p className="mt-4 text-sm text-[#5a6c7d]">لا يوجد أقسام مسجلة</p>
          ) : (
            <div className="mt-4 space-y-3">
              {sections.map((sec) => (
                <div
                  key={sec.name}
                  className="rounded-lg border border-[#c9d6e3]/60 bg-[#f8fafc]/50 p-3 sm:border-0 sm:bg-transparent sm:p-0"
                >
                  <p className="mb-2 text-xs font-semibold text-[#1e3a5f] sm:mb-1 sm:text-[#5a6c7d] sm:font-medium">{sec.name}</p>
                  <ul className="space-y-1.5 text-sm text-[#1B1B1B] sm:mt-1 sm:space-y-0.5">
                    {sec.users.map((u) => (
                      <li key={u.id} className="flex items-center gap-2 sm:gap-0">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E6B3A]/50 sm:hidden" />
                        <span>{u.name || u.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* رابط المعاملات */}
      <div className="rounded-xl border border-[#c9d6e3] bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-[#1e3a5f]">المعاملات</h3>
        <p className="mt-1 text-sm text-[#5a6c7d]">عرض جميع معاملات هذا المكتب والبحث والفلترة</p>
        <Link
          href={`/supervisor/transactions?officeId=${office.id}`}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1E6B3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#175a2e]"
        >
          عرض المعاملات
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>

      {/* روابط العودة */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/supervisor/offices"
          className="inline-flex items-center gap-2 rounded-xl border border-[#c9d6e3] bg-white px-4 py-2.5 text-sm font-medium text-[#1e3a5f] shadow-sm transition-all hover:border-[#1E6B3A]/30 hover:bg-[#1E6B3A]/5 hover:text-[#1E6B3A]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          العودة لقائمة المكاتب
        </Link>
        <Link
          href="/supervisor"
          className="inline-flex items-center gap-2 rounded-xl border border-[#c9d6e3] bg-white px-4 py-2.5 text-sm font-medium text-[#1e3a5f] shadow-sm transition-all hover:border-[#1E6B3A]/30 hover:bg-[#1E6B3A]/5 hover:text-[#1E6B3A]"
        >
          لوحة التحكم
        </Link>
      </div>
    </div>
  );
}
