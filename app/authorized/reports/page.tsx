"use client";

import { useState, useCallback, useEffect } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import Link from "next/link";

type Stats = {
  total: number;
  completed: number;
  notCompleted: number;
  officesCount: number;
  officeNames: string[];
  distribution: { officeName: string; count: number }[];
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "arab",
  }).format(date);
}

export default function AuthorizedReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/authorized/stats", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setError("فشل تحميل الإحصائيات");
      }
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useAutoRefresh(loadStats);

  const handlePrint = useCallback(() => {
    if (!stats) return;
    const printDate = formatDateTime(new Date());
    const tableRows = stats.distribution
      .map(
        (d) =>
          `<tr><td style="padding:10px 12px;border:1px solid #ddd">${d.officeName}</td><td style="padding:10px 12px;border:1px solid #ddd;text-align:center">${d.count}</td></tr>`
      )
      .join("");
    const html = `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8">
  <title>تقرير إحصائيات المخول</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 14px; padding: 20px; line-height: 1.5; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
    .summary { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
    .summary-item { padding: 12px 20px; border: 1px solid #ddd; border-radius: 8px; min-width: 140px; }
    .summary-item strong { display: block; font-size: 20px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { padding: 10px 12px; border: 1px solid #333; background: #f5f5f5; text-align: right; }
    td { padding: 10px 12px; border: 1px solid #ddd; }
    .footer { margin-top: 24px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>تقرير إحصائيات وتقارير — المخول</h1>
  <p class="meta">تاريخ الطباعة: ${printDate}</p>
  <div class="summary">
    <div class="summary-item">إجمالي المستلمة: <strong>${stats.total}</strong></div>
    <div class="summary-item">المنجزة: <strong>${stats.completed}</strong></div>
    <div class="summary-item">غير المنجزة: <strong>${stats.notCompleted}</strong></div>
    <div class="summary-item">عدد المكاتب: <strong>${stats.officesCount}</strong></div>
  </div>
  <h2 style="font-size: 16px; margin-bottom: 8px;">توزيع المعاملات حسب المكاتب</h2>
  <table>
    <thead><tr><th>المكتب</th><th style="text-align:center;width:100px">العدد</th></tr></thead>
    <tbody>${tableRows || "<tr><td colspan=\"2\">لا توجد بيانات</td></tr>"}</tbody>
  </table>
  <p class="footer">— نهاية التقرير —</p>
</body>
</html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => {
        w.print();
        w.close();
      }, 300);
    }
  }, [stats]);

  return (
    <div className="min-w-0 space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1B1B1B] sm:text-2xl">إحصائيات وتقارير</h1>
          <p className="mt-1 text-sm text-[#5a5a5a]">إحصائيات المعاملات وتوزيعها حسب المكاتب</p>
        </div>
        <Link
          href="/authorized"
          className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] transition-colors hover:bg-[#f6f3ed]"
        >
          لوحة التحكم
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-[#d4cfc8] bg-white py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#1E6B3A] border-t-transparent" />
          <p className="text-sm text-[#5a5a5a]">جاري تحميل الإحصائيات...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-center">
          <p className="text-amber-800">{error}</p>
          <button
            type="button"
            onClick={loadStats}
            className="mt-4 min-h-[44px] rounded-xl bg-[#1E6B3A] px-6 py-3 text-sm font-medium text-white"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <article className="rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1B1B1B]">ملخص الإحصائيات</h2>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-lg border border-[#5B7C99]/50 bg-[#5B7C99]/10 px-4 py-2 text-sm font-medium text-[#5B7C99] hover:bg-[#5B7C99]/20"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة التقرير
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[#5B7C99]/20 bg-[#5B7C99]/5 p-4">
                <p className="text-xs font-medium text-[#5a5a5a]">إجمالي المستلمة</p>
                <p className="mt-1 text-2xl font-bold text-[#5B7C99]">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-[#1E6B3A]/20 bg-[#1E6B3A]/5 p-4">
                <p className="text-xs font-medium text-[#5a5a5a]">المنجزة</p>
                <p className="mt-1 text-2xl font-bold text-[#1E6B3A]">{stats.completed}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <p className="text-xs font-medium text-[#5a5a5a]">غير المنجزة</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">{stats.notCompleted}</p>
              </div>
              <div className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-4">
                <p className="text-xs font-medium text-[#5a5a5a]">عدد المكاتب</p>
                <p className="mt-1 text-2xl font-bold text-[#7C3AED]">{stats.officesCount}</p>
              </div>
            </div>
          </article>

          {stats.distribution.length > 0 && (
            <article className="rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-[#1B1B1B]">توزيع المعاملات حسب المكاتب</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#d4cfc8]">
                      <th className="px-4 py-3 text-right text-sm font-semibold text-[#1B1B1B]">المكتب</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-[#1B1B1B] w-24">العدد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.distribution.map((d, i) => (
                      <tr key={i} className="border-b border-[#d4cfc8]">
                        <td className="px-4 py-3 font-medium text-[#1B1B1B]">{d.officeName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded-full bg-[#5B7C99]/15 px-3 py-1 text-sm font-bold text-[#5B7C99]">
                            {d.count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {stats.officeNames.length > 0 && (
                <p className="mt-4 text-sm text-[#5a5a5a]">
                  المكاتب التي تستلم منها: {stats.officeNames.join(" • ")}
                </p>
              )}
            </article>
          )}

          {stats.total === 0 && (
            <div className="rounded-xl border border-[#d4cfc8] bg-white p-12 text-center">
              <p className="text-[#5a5a5a]">لا توجد معاملات مسجلة حتى الآن.</p>
              <Link
                href="/authorized"
                className="mt-4 inline-block text-sm font-medium text-[#1E6B3A] hover:underline"
              >
                العودة للوحة التحكم
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
