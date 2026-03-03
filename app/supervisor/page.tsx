"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function SupervisorDashboard() {
  const { data: session } = useSession();
  const user = session?.user as { name?: string | null } | undefined;
  const name = user?.name || "المشرف";

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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">لوحة تحكم الإشراف والمراقبة</h1>
              <p className="mt-2 text-sm text-[#5a6c7d] leading-relaxed">
                مرحباً، <span className="font-semibold text-[#1B1B1B]">{name}</span>
              </p>
              <p className="mt-1 text-sm text-[#5a6c7d]">
                هنا يمكنك مراقبة ومتابعة نشاط وعمل مكاتب المحافظة
              </p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#1E6B3A]/20 bg-gradient-to-br from-[#1E6B3A]/10 to-[#B08D57]/5">
              <svg className="h-7 w-7 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* البطاقات السريعة */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/supervisor/offices"
          className="group flex items-center gap-4 rounded-xl border border-[#c9d6e3] bg-white p-5 shadow-sm transition-all duration-200 hover:border-[#1E6B3A]/30 hover:shadow-md"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#1E6B3A]/20 bg-[#1E6B3A]/5 transition-colors group-hover:bg-[#1E6B3A]/10">
            <svg className="h-6 w-6 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[#1B1B1B] group-hover:text-[#1E6B3A]">عرض المكاتب</h3>
            <p className="mt-0.5 text-sm text-[#5a6c7d]">عرض قائمة المكاتب ومسؤوليها وعناوينها</p>
          </div>
          <svg className="h-5 w-5 shrink-0 text-[#5a6c7d] group-hover:text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="flex items-center gap-4 rounded-xl border border-dashed border-[#c9d6e3] bg-[#f8fafc] p-5 opacity-75">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#c9d6e3] bg-white">
            <svg className="h-6 w-6 text-[#5a6c7d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[#5a6c7d]">الإحصائيات</h3>
            <p className="mt-0.5 text-sm text-[#5a6c7d]">قريباً</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-dashed border-[#c9d6e3] bg-[#f8fafc] p-5 opacity-75">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#c9d6e3] bg-white">
            <svg className="h-6 w-6 text-[#5a6c7d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[#5a6c7d]">التقارير</h3>
            <p className="mt-0.5 text-sm text-[#5a6c7d]">قريباً</p>
          </div>
        </div>
      </div>

      {/* بطاقة ترحيب رسمية */}
      <div className="rounded-xl border border-[#c9d6e3] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:gap-6 sm:text-right">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#1E6B3A]/20 bg-gradient-to-br from-[#1E6B3A]/10 to-transparent">
            <svg className="h-8 w-8 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1e3a5f]">بوابة الإشراف والمراقبة</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#5a6c7d]">
              مرحباً بك في منصة مراقبة ومتابعة مكاتب المحافظة. يمكنك من خلال هذه اللوحة الاطلاع على المكاتب ومسؤوليها والعناوين، مع إمكانية متابعة النشاط والإحصائيات عند تفعيلها.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
