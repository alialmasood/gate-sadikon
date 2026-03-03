"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type Office = {
  id: string;
  name: string;
  managerName: string | null;
  location: string | null;
};

export default function SupervisorOfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOffices = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const r = await fetch("/api/supervisor/offices");
      const data = r.ok ? await r.json() : [];
      setOffices(Array.isArray(data) ? data : []);
    } catch {
      setOffices([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffices();
  }, [loadOffices]);

  useAutoRefresh(() => loadOffices({ silent: true }));

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
              <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">عرض المكاتب</h1>
              <p className="mt-2 text-sm text-[#5a6c7d] leading-relaxed">
                قائمة مكاتب المحافظة مع بيانات مسؤوليها وعناوينها
              </p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#1E6B3A]/20 bg-gradient-to-br from-[#1E6B3A]/10 to-[#B08D57]/5">
              <svg className="h-7 w-7 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white p-5 shadow-sm">
              <div className="h-5 w-3/4 animate-pulse rounded bg-[#e8ecf0]" />
              <div className="mt-4 space-y-3">
                <div className="h-4 w-1/2 animate-pulse rounded bg-[#e8ecf0]" />
                <div className="h-4 w-full animate-pulse rounded bg-[#e8ecf0]" />
              </div>
            </div>
          ))}
        </div>
      ) : offices.length === 0 ? (
        <div className="rounded-xl border border-[#c9d6e3] bg-white p-8 shadow-sm sm:p-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#c9d6e3] bg-[#f8fafc]">
              <svg className="h-8 w-8 text-[#5a6c7d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-[#1B1B1B]">لا توجد مكاتب مسجلة</p>
              <p className="mt-1 text-sm text-[#5a6c7d]">لم يتم العثور على أي مكاتب في النظام</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offices.map((office) => (
            <Link
              key={office.id}
              href={`/supervisor/offices/${office.id}`}
              className="group block cursor-pointer overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm transition-all duration-200 hover:border-[#1E6B3A]/30 hover:shadow-md"
            >
              <div className="border-b border-[#c9d6e3]/50 bg-gradient-to-br from-[#1E6B3A]/5 to-transparent px-5 py-4">
                <h3 className="text-base font-bold text-[#1e3a5f] group-hover:text-[#1E6B3A]">{office.name}</h3>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1E6B3A]/20 bg-[#1E6B3A]/5">
                    <svg className="h-4 w-4 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#5a6c7d]">مدير/مسؤول المكتب</p>
                    <p className="mt-0.5 text-sm font-medium text-[#1B1B1B]">{office.managerName || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#c9d6e3] bg-[#f8fafc]">
                    <svg className="h-4 w-4 text-[#5a6c7d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#5a6c7d]">العنوان</p>
                    <p className="mt-0.5 text-sm text-[#1B1B1B]">{office.location || "—"}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* زر العودة للوحة التحكم */}
      <div className="pt-2">
        <Link
          href="/supervisor"
          className="inline-flex items-center gap-2 rounded-xl border border-[#c9d6e3] bg-white px-4 py-2.5 text-sm font-medium text-[#1e3a5f] shadow-sm transition-all hover:border-[#1E6B3A]/30 hover:bg-[#1E6B3A]/5 hover:text-[#1E6B3A]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          العودة للوحة التحكم
        </Link>
      </div>
    </div>
  );
}
