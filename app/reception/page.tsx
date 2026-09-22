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

const PIE_COLORS = ["#1e3a5f", "#5B8DEF", "#027A48", "#667085", "#B42318", "#98A2B3", "#0ea5e9"];
const CARD = "rounded-2xl border border-[#E6EAF0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

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
    <div className="space-y-3" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-[#101828]">وحدة الاستقبال والاستعلامات</h2>
          <p className="mt-0.5 text-sm text-[#667085]">لوحة تحكم الاستقبال والاستعلامات</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/reception/citizens/new"
            className="flex h-9 items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3 text-sm font-medium text-white transition-colors hover:bg-[#152d47]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            معاملة جديدة
          </Link>
          <Link
            href="/reception/reports"
            className="flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium text-[#344054] ring-1 ring-[#E6EAF0] transition-colors hover:bg-[#F6F8FB]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            تقارير وإحصائيات
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a5f]/25 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <article className={`overflow-hidden ${CARD} xl:col-span-12`}>
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <h2 className="ml-1 text-sm font-semibold text-[#101828]">روابط سريعة</h2>
              <Link
                href="/reception/citizens"
                className="flex h-8 items-center gap-1.5 rounded-xl bg-[#F6F8FB] px-3 text-sm font-medium text-[#101828] transition hover:bg-white hover:shadow-[0_4px_12px_rgba(16,24,40,0.06)]"
              >
                <svg className="h-4 w-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                شؤون المواطنين
              </Link>
              <Link
                href="/reception/transactions"
                className="flex h-8 items-center gap-1.5 rounded-xl bg-[#F6F8FB] px-3 text-sm font-medium text-[#101828] transition hover:bg-white hover:shadow-[0_4px_12px_rgba(16,24,40,0.06)]"
              >
                <svg className="h-4 w-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                المعاملات
              </Link>
              <Link
                href="/reception/reports"
                className="flex h-8 items-center gap-1.5 rounded-xl bg-[#F6F8FB] px-3 text-sm font-medium text-[#101828] transition hover:bg-white hover:shadow-[0_4px_12px_rgba(16,24,40,0.06)]"
              >
                <svg className="h-4 w-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                تقارير وإحصائيات
              </Link>
            </div>
          </article>

          {/* البطاقات الإحصائية الرئيسية */}
          <article className={`overflow-hidden ${CARD} xl:col-span-12`}>
            <div className="flex flex-wrap items-end justify-between gap-2 px-4 py-2.5">
              <div>
                <h2 className="text-sm font-semibold text-[#101828]">ملخص إحصائي</h2>
                <p className="text-xs text-[#667085]">أهم المؤشرات الإحصائية للمكتب</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-3 pb-3 lg:grid-cols-4">
              <div className="rounded-xl bg-[#F6F8FB] px-3 py-2.5">
                <p className="text-xs font-medium text-[#667085]">إجمالي المواطنين المراجعين</p>
                <p className="mt-1 text-2xl font-semibold leading-none text-[#101828]">{data?.totalCitizens ?? "—"}</p>
                <p className="mt-1 text-[11px] text-[#98A2B3]">مواطنين مميزين براجعوا المكتب</p>
              </div>
              <div className="rounded-xl bg-[#F6F8FB] px-3 py-2.5">
                <p className="text-xs font-medium text-[#667085]">إجمالي المعاملات</p>
                <p className="mt-1 text-2xl font-semibold leading-none text-[#101828]">{data?.totalTransactions ?? "—"}</p>
                <p className="mt-1 text-[11px] text-[#98A2B3]">جميع المعاملات المسجلة</p>
              </div>
              <div className="rounded-xl bg-[#F6F8FB] px-3 py-2.5">
                <p className="text-xs font-medium text-[#667085]">قيد التنفيذ</p>
                <p className="mt-1 text-2xl font-semibold leading-none text-[#101828]">{data?.statusBreakdown?.pending ?? "—"}</p>
                <p className="mt-1 text-[11px] text-[#98A2B3]">معاملات جارية</p>
              </div>
              <div className="rounded-xl bg-[#F6F8FB] px-3 py-2.5">
                <p className="text-xs font-medium text-[#667085]">منجزة</p>
                <p className="mt-1 text-2xl font-semibold leading-none text-[#101828]">{data?.statusBreakdown?.done ?? "—"}</p>
                <p className="mt-1 text-[11px] text-[#98A2B3]">معاملات مكتملة</p>
              </div>
            </div>
          </article>

          {/* المعاملات المستلمة — اليوم، الأسبوع، الشهر */}
          <article className={`overflow-hidden ${CARD} xl:col-span-12`}>
            <div className="px-4 py-2.5">
              <h2 className="text-sm font-semibold text-[#101828]">المعاملات المستلمة</h2>
              <p className="text-xs text-[#667085]">عدد المعاملات المستلمة حسب الفترة</p>
            </div>
            <div className="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#F6F8FB] px-3 py-2.5">
                <p className="text-xs font-medium text-[#667085]">اليوم</p>
                <p className="mt-1 text-2xl font-semibold leading-none text-[#101828]">{data?.transactionsToday ?? "—"}</p>
                <p className="mt-1 text-[11px] text-[#98A2B3]">معاملة مستلمة اليوم</p>
              </div>
              <div className="rounded-xl bg-[#F6F8FB] px-3 py-2.5">
                <p className="text-xs font-medium text-[#667085]">هذا الأسبوع</p>
                <p className="mt-1 text-2xl font-semibold leading-none text-[#101828]">{data?.transactionsThisWeek ?? "—"}</p>
                <p className="mt-1 text-[11px] text-[#98A2B3]">معاملة مستلمة هذا الأسبوع</p>
              </div>
              <div className="rounded-xl bg-[#F6F8FB] px-3 py-2.5">
                <p className="text-xs font-medium text-[#667085]">هذا الشهر</p>
                <p className="mt-1 text-2xl font-semibold leading-none text-[#101828]">{data?.transactionsThisMonth ?? "—"}</p>
                <p className="mt-1 text-[11px] text-[#98A2B3]">معاملة مستلمة هذا الشهر</p>
              </div>
            </div>
          </article>

          {/* الرسم الرئيسي */}
          <article className={`overflow-hidden ${CARD} xl:col-span-8`}>
            <div className="px-4 py-2.5">
              <h2 className="text-sm font-semibold text-[#101828]">المعاملات المستلمة — آخر ٣٠ يوماً</h2>
              <p className="text-xs text-[#667085]">عدد المعاملات المسجلة يومياً</p>
            </div>
            <div className="h-[220px] px-3 pb-3" style={{ minWidth: 0 }}>
              {!data?.typeByDay?.length ? (
                <div className="flex h-full items-center justify-center rounded-xl bg-[#F6F8FB] text-sm text-[#667085]">لا توجد بيانات</div>
              ) : (
                <ResponsiveContainer width="100%" height={220} minHeight={180}>
                  <BarChart
                    data={data.typeByDay}
                    margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => formatDateShort(v)}
                      tick={{ fontSize: 10, fill: "#667085" }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#667085" }} width={28} />
                    <Tooltip
                      formatter={(v) => [v ?? 0, "معاملة"]}
                      labelFormatter={(l) => formatDateShort(l)}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #E6EAF0", boxShadow: "0 8px 24px rgba(16,24,40,0.06)" }}
                    />
                    <Bar dataKey="المجموع" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <div className="grid grid-cols-1 gap-3 xl:col-span-4">
            {/* تصنيف الحالة */}
            <article className={`overflow-hidden ${CARD}`}>
              <div className="px-4 py-2.5">
                <h2 className="text-sm font-semibold text-[#101828]">تصنيف الحالة</h2>
                <p className="text-xs text-[#667085]">توزيع المعاملات حسب حالة المتابعة</p>
              </div>
              <div className="space-y-1.5 px-3 pb-3">
                <div className="flex items-center justify-between rounded-xl bg-[#F6F8FB] px-3 py-2">
                  <span className="text-sm font-medium text-[#101828]">قيد التنفيذ</span>
                  <span className="rounded-full bg-[#EEF2F6] px-2.5 py-0.5 text-xs font-semibold text-[#344054]">
                    {data?.statusBreakdown?.pending ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#F6F8FB] px-3 py-2">
                  <span className="text-sm font-medium text-[#101828]">منجزة</span>
                  <span className="rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-xs font-semibold text-[#027A48]">
                    {data?.statusBreakdown?.done ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#FEF3F2] px-3 py-2">
                  <span className="text-sm font-medium text-[#101828]">متأخرة</span>
                  <span className="rounded-full bg-[#FEE4E2] px-2.5 py-0.5 text-xs font-semibold text-[#B42318]">
                    {data?.statusBreakdown?.overdue ?? 0}
                  </span>
                </div>
                <Link
                  href="/reception/transactions"
                  className="block pt-1 text-center text-xs font-medium text-[#1e3a5f] hover:underline"
                >
                  عرض جميع المعاملات ←
                </Link>
              </div>
            </article>

            {/* توزيع نوع المعاملات — دائري */}
            <article className={`overflow-hidden ${CARD}`}>
              <div className="px-4 py-2.5">
                <h2 className="text-sm font-semibold text-[#101828]">توزيع نوع المعاملات</h2>
                <p className="text-xs text-[#667085]">توزيع المعاملات حسب النوع</p>
              </div>
              <div className="flex items-center gap-3 px-3 pb-3">
                {!data?.typeBreakdown?.length ? (
                  <p className="w-full py-6 text-center text-sm text-[#667085]">لا توجد معاملات</p>
                ) : (
                  <>
                    <div className="shrink-0">
                      <PieChart width={124} height={124}>
                        <Pie
                          data={data.typeBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={48}
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
                          contentStyle={{ borderRadius: "12px", border: "1px solid #E6EAF0", boxShadow: "0 8px 24px rgba(16,24,40,0.06)" }}
                        />
                      </PieChart>
                    </div>
                    <ul className="min-w-0 flex-1 space-y-1" role="list">
                      {data.typeBreakdown.map((item, i) => {
                        const total = data.typeBreakdown.reduce((s, x) => s + x.value, 0);
                        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        return (
                          <li key={item.name} className="flex items-center gap-1.5 text-xs">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                            <span className="truncate text-[#101828]">{item.name}</span>
                            <span className="shrink-0 text-[#667085]">({item.value} — {pct}%)</span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </article>
          </div>

          {/* رسم بياني: المعاملات حسب الأسبوع */}
          <article className={`overflow-hidden ${CARD} xl:col-span-6`}>
            <div className="px-4 py-2.5">
              <h2 className="text-sm font-semibold text-[#101828]">المعاملات المستلمة — آخر ٤ أسابيع</h2>
              <p className="text-xs text-[#667085]">عدد المعاملات حسب الأسبوع</p>
            </div>
            <div className="h-[180px] px-3 pb-3" style={{ minWidth: 0 }}>
              {!data?.typeByWeek?.length ? (
                <div className="flex h-full items-center justify-center rounded-xl bg-[#F6F8FB] text-sm text-[#667085]">لا توجد بيانات</div>
              ) : (
                <ResponsiveContainer width="100%" height={180} minHeight={160}>
                  <BarChart
                    data={data.typeByWeek}
                    margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#667085" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#667085" }} width={28} />
                    <Tooltip
                      formatter={(v) => [v ?? 0, "معاملة"]}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #E6EAF0", boxShadow: "0 8px 24px rgba(16,24,40,0.06)" }}
                    />
                    <Bar dataKey="المجموع" fill="#5B8DEF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          {/* رسم بياني: نوع المعاملات خلال الأسابيع — يظهر دائمًا */}
          <article className={`overflow-hidden ${CARD} xl:col-span-6`}>
            <div className="px-4 py-2.5">
              <h2 className="text-sm font-semibold text-[#101828]">نوع المعاملات خلال الفترات الزمنية</h2>
              <p className="text-xs text-[#667085]">توزيع الأنواع حسب الأسبوع (أكثر ٥ أنواع)</p>
            </div>
            <div className="h-[180px] px-3 pb-3" style={{ minWidth: 0 }}>
              {data && data.typeBreakdown.length > 0 && data.typeByWeek.length > 0 ? (
                <ResponsiveContainer width="100%" height={180} minHeight={160}>
                  <BarChart
                    data={data.typeByWeek}
                    margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
                    barCategoryGap="20%"
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#667085" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#667085" }} width={28} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid #E6EAF0", boxShadow: "0 8px 24px rgba(16,24,40,0.06)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
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
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl bg-[#F6F8FB] text-sm text-[#667085]">لا توجد بيانات</div>
              )}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
