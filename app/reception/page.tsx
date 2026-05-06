"use client";

import { useEffect, useState, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type DashboardData = {
  totalCitizens: number;
  totalTransactions: number;
  transactionsToday: number;
  transactionsThisWeek: number;
  transactionsThisMonth: number;
  typeBreakdown: { name: string; value: number }[];
  statusBreakdown: { pending: number; done: number; overdue: number };
  typeByDay: { date: string; المجموع: number }[];
  typeByWeek: Record<string, string | number>[];
};

const PIE_COLORS = ["#1E6B3A", "#5B7C99", "#B08D57", "#7C3AED", "#b91c1c", "#6b7280", "#0ea5e9"];

function formatDateShort(d: string) {
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      month: "short",
      day: "numeric",
      numberingSystem: "arab",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

export default function ReceptionDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch("/api/reception/dashboard", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(() => loadData({ silent: true }));

  return (
    <div className="space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#d4cfc8] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B1B1B]">وحدة الاستقبال والاستعلامات</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">لوحة تحكم الاستقبال والاستعلامات</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/reception/citizens/new"
            className="flex items-center gap-2 rounded-xl border border-[#1E6B3A] bg-[#1E6B3A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#175a2e]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            معاملة جديدة
          </Link>
          <Link
            href="/reception/reports"
            className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] shadow-sm transition-colors hover:bg-[#f6f3ed]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            تقارير وإحصائيات
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1E6B3A] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* البطاقات الإحصائية الرئيسية */}
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">ملخص إحصائي</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">أهم المؤشرات الإحصائية للمكتب</p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#5B7C99] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">إجمالي المواطنين المراجعين</p>
                <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{data?.totalCitizens ?? "—"}</p>
                <p className="mt-1 text-xs text-[#5a5a5a]">مواطنين مميزين براجعوا المكتب</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">إجمالي المعاملات</p>
                <p className="mt-2 text-2xl font-bold text-[#1E6B3A]">{data?.totalTransactions ?? "—"}</p>
                <p className="mt-1 text-xs text-[#5a5a5a]">جميع المعاملات المسجلة</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#B08D57] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">قيد التنفيذ</p>
                <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{data?.statusBreakdown?.pending ?? "—"}</p>
                <p className="mt-1 text-xs text-[#5a5a5a]">معاملات جارية</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">منجزة</p>
                <p className="mt-2 text-2xl font-bold text-[#1E6B3A]">{data?.statusBreakdown?.done ?? "—"}</p>
                <p className="mt-1 text-xs text-[#5a5a5a]">معاملات مكتملة</p>
              </div>
            </div>
          </article>

          {/* المعاملات المستلمة — اليوم، الأسبوع، الشهر */}
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">المعاملات المستلمة</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">عدد المعاملات المستلمة حسب الفترة</p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-3">
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-[#f6f3ed]/30 p-4">
                <p className="text-sm font-medium text-[#5a5a5a]">اليوم</p>
                <p className="mt-2 text-3xl font-bold text-[#1E6B3A]">{data?.transactionsToday ?? "—"}</p>
                <p className="mt-1 text-xs text-[#5a5a5a]">معاملة مستلمة اليوم</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#5B7C99] bg-[#f6f3ed]/30 p-4">
                <p className="text-sm font-medium text-[#5a5a5a]">هذا الأسبوع</p>
                <p className="mt-2 text-3xl font-bold text-[#5B7C99]">{data?.transactionsThisWeek ?? "—"}</p>
                <p className="mt-1 text-xs text-[#5a5a5a]">معاملة مستلمة هذا الأسبوع</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#B08D57] bg-[#f6f3ed]/30 p-4">
                <p className="text-sm font-medium text-[#5a5a5a]">هذا الشهر</p>
                <p className="mt-2 text-3xl font-bold text-[#B08D57]">{data?.transactionsThisMonth ?? "—"}</p>
                <p className="mt-1 text-xs text-[#5a5a5a]">معاملة مستلمة هذا الشهر</p>
              </div>
            </div>
          </article>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* توزيع نوع المعاملات — دائري */}
            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
                <h2 className="text-base font-semibold text-[#1B1B1B]">توزيع نوع المعاملات</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">توزيع المعاملات حسب النوع</p>
              </div>
              <div className="flex min-h-72 flex-col items-center gap-4 px-6 py-4 sm:flex-row sm:justify-center sm:gap-8">
                {!data?.typeBreakdown?.length ? (
                  <p className="text-[#5a5a5a]">لا توجد معاملات</p>
                ) : (
                  <>
                    <div className="shrink-0">
                      <PieChart width={200} height={200}>
                        <Pie
                          data={data.typeBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {data.typeBreakdown.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v, _name, props) => {
                            const val = Number(v ?? 0);
                            const total = data.typeBreakdown.reduce((s, x) => s + x.value, 0);
                            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                            const label = (props?.payload as { name?: string })?.name ?? "";
                            return [`${val} (${pct}%)`, label];
                          }}
                          contentStyle={{ borderRadius: "8px", border: "1px solid #d4cfc8" }}
                        />
                      </PieChart>
                    </div>
                    <ul className="flex flex-col gap-2 self-start sm:self-center" role="list">
                      {data.typeBreakdown.map((item, i) => {
                        const total = data.typeBreakdown.reduce((s, x) => s + x.value, 0);
                        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        return (
                          <li key={item.name} className="flex items-center gap-2 text-sm">
                            <span
                              className="h-3 w-3 shrink-0 rounded-sm"
                              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                            <span className="text-[#1B1B1B]">{item.name}</span>
                            <span className="text-[#5a5a5a]">({item.value} — {pct}%)</span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </article>

            {/* المعاملات المتأخرة — تصنيف إضافي */}
            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
                <h2 className="text-base font-semibold text-[#1B1B1B]">تصنيف الحالة</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">توزيع المعاملات حسب حالة المتابعة</p>
              </div>
              <div className="space-y-3 p-6">
                <div className="flex items-center justify-between rounded-xl border border-[#d4cfc8] bg-[#f6f3ed]/30 px-4 py-3">
                  <span className="text-sm font-medium text-[#1B1B1B]">قيد التنفيذ</span>
                  <span className="rounded-full bg-[#B08D57]/20 px-3 py-1 text-sm font-bold text-[#B08D57]">
                    {data?.statusBreakdown?.pending ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#d4cfc8] bg-[#f6f3ed]/30 px-4 py-3">
                  <span className="text-sm font-medium text-[#1B1B1B]">منجزة</span>
                  <span className="rounded-full bg-[#1E6B3A]/20 px-3 py-1 text-sm font-bold text-[#1E6B3A]">
                    {data?.statusBreakdown?.done ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#d4cfc8] bg-red-50/50 px-4 py-3">
                  <span className="text-sm font-medium text-[#1B1B1B]">متأخرة</span>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                    {data?.statusBreakdown?.overdue ?? 0}
                  </span>
                </div>
                <div className="mt-4 border-t border-[#d4cfc8] pt-4">
                  <Link
                    href="/reception/transactions"
                    className="block text-center text-sm font-medium text-[#1E6B3A] hover:underline"
                  >
                    عرض جميع المعاملات ←
                  </Link>
                </div>
              </div>
            </article>
          </div>

          {/* رسم بياني: المعاملات المستلمة خلال 30 يوماً */}
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">المعاملات المستلمة — آخر ٣٠ يوماً</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">عدد المعاملات المسجلة يومياً</p>
            </div>
            <div className="h-72 min-h-[200px] px-6 py-4" style={{ minWidth: 0 }}>
              {!data?.typeByDay?.length ? (
                <div className="flex h-full items-center justify-center text-[#5a5a5a]">لا توجد بيانات</div>
              ) : (
                <ResponsiveContainer width="100%" height={288} minHeight={200}>
                  <BarChart
                    data={data.typeByDay}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => formatDateShort(v)}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v) => [v ?? 0, "معاملة"]}
                      labelFormatter={(l) => formatDateShort(l)}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #d4cfc8" }}
                    />
                    <Bar dataKey="المجموع" fill="#1E6B3A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          {/* رسم بياني: المعاملات حسب الأسبوع */}
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">المعاملات المستلمة — آخر ٤ أسابيع</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">عدد المعاملات حسب الأسبوع</p>
            </div>
            <div className="h-64 min-h-[200px] px-6 py-4" style={{ minWidth: 0 }}>
              {!data?.typeByWeek?.length ? (
                <div className="flex h-full items-center justify-center text-[#5a5a5a]">لا توجد بيانات</div>
              ) : (
                <ResponsiveContainer width="100%" height={256} minHeight={200}>
                  <BarChart
                    data={data.typeByWeek}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v) => [v ?? 0, "معاملة"]}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #d4cfc8" }}
                    />
                    <Bar dataKey="المجموع" fill="#5B7C99" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          {/* رسم بياني: نوع المعاملات خلال الأسابيع */}
          {data && (data.typeBreakdown?.length ?? 0) > 0 && (data.typeByWeek?.length ?? 0) > 0 && (
            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
                <h2 className="text-base font-semibold text-[#1B1B1B]">نوع المعاملات خلال الفترات الزمنية</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">توزيع الأنواع حسب الأسبوع (أكثر ٥ أنواع)</p>
              </div>
              <div className="h-72 min-h-[200px] px-6 py-4" style={{ minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={288} minHeight={200}>
                  <BarChart
                    data={data.typeByWeek}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    barCategoryGap="20%"
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid #d4cfc8" }}
                    />
                    <Legend />
                    {data.typeBreakdown.slice(0, 5).map((t, i) => (
                      <Bar
                        key={t.name}
                        dataKey={t.name}
                        stackId="types"
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        radius={[0, 0, 0, 0]}
                        name={t.name}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          )}

          {/* روابط سريعة */}
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">روابط سريعة</h2>
            </div>
            <div className="flex flex-wrap gap-3 p-6">
              <Link
                href="/reception/citizens"
                className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-3 text-sm font-medium text-[#1B1B1B] transition hover:bg-[#f6f3ed]"
              >
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                شؤون المواطنين
              </Link>
              <Link
                href="/reception/transactions"
                className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-3 text-sm font-medium text-[#1B1B1B] transition hover:bg-[#f6f3ed]"
              >
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                المعاملات
              </Link>
              <Link
                href="/reception/reports"
                className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-3 text-sm font-medium text-[#1B1B1B] transition hover:bg-[#f6f3ed]"
              >
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                تقارير وإحصائيات
              </Link>
            </div>
          </article>
        </>
      )}
    </div>
  );
}
