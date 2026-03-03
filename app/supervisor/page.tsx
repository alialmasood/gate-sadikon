"use client";

import { useEffect, useState, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type DashboardData = {
  stats: {
    officeCount: number;
    adminAccountsCount: number;
    parliamentMembersCount: number;
    totalTransactions: number;
    doneTransactions: number;
    pendingTransactions: number;
    cannotCompleteCount: number;
    delegateCount: number;
    formationsCount: number;
    subDeptsCount: number;
    transactionsToday: number;
    transactionsThisWeek: number;
    transactionsThisMonth: number;
  };
  officesChartData: { name: string; value: number }[];
  delegatesChartData: { name: string; value: number }[];
  timelineData: { date: string; label: string; count: number }[];
};

const PIE_COLORS = ["#1E6B3A", "#B08D57", "#dc2626", "#3b82f6"];
const CHART_COLORS = { primary: "#1E6B3A", secondary: "#B08D57" };

const StatCard = ({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: number | string;
  href?: string;
  icon: React.ReactNode;
}) => {
  const content = (
    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#c9d6e3] bg-white p-3 shadow-sm sm:p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1E6B3A]/20 bg-[#1E6B3A]/5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[#5a6c7d]">{label}</p>
        <p className="text-lg font-bold text-[#1e3a5f] sm:text-xl">{value}</p>
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {content}
      </Link>
    );
  }
  return content;
};

export default function SupervisorDashboard() {
  const { data: session } = useSession();
  const user = session?.user as { name?: string | null } | undefined;
  const name = user?.name || "المشرف";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    if (!opts?.silent) setError("");
    try {
      const res = await fetch("/api/supervisor/dashboard");
      if (!res.ok) throw new Error("فشل التحميل");
      const json = await res.json();
      setData(json);
    } catch {
      if (!opts?.silent) setError("تعذر تحميل بيانات لوحة التحكم");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useAutoRefresh(() => loadDashboard({ silent: true }));

  const stats = data?.stats;
  const officesChart = data?.officesChartData ?? [];
  const delegatesChart = data?.delegatesChartData ?? [];
  const timelineChart = data?.timelineData ?? [];

  const statusPieData = stats
    ? [
        { name: "منجزة", value: stats.doneTransactions, fill: "#1E6B3A" },
        { name: "قيد التنفيذ", value: stats.pendingTransactions, fill: "#B08D57" },
        { name: "لا يمكن إنجازها", value: stats.cannotCompleteCount, fill: "#dc2626" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      {/* ترويسة */}
      <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm">
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #1E6B3A, #B08D57)" }}
          aria-hidden
        />
        <div className="px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">لوحة تحكم الإشراف والمراقبة</h1>
              <p className="mt-2 text-sm text-[#5a6c7d]">
                مرحباً، <span className="font-semibold text-[#1B1B1B]">{name}</span>
              </p>
              <p className="mt-1 text-xs leading-tight text-[#5a6c7d] sm:text-sm">
                نظرة شاملة على المكاتب والمعاملات والمخولين
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

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-amber-800">
          {error}
        </div>
      )}

      {/* بطاقات الإحصائيات */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-[#1e3a5f] sm:text-lg">الإحصائيات</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-[#c9d6e3] bg-[#f8fafc]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard
              label="عدد المكاتب"
              value={stats?.officeCount ?? "—"}
              href="/supervisor/offices"
              icon={
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <StatCard
              label="الحسابات الإدارية"
              value={stats?.adminAccountsCount ?? "—"}
              icon={
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
            <StatCard
              label="التشكيلات"
              value={stats?.formationsCount ?? "—"}
              href="/supervisor/formations"
              icon={
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              }
            />
            <StatCard
              label="الدوائر الفرعية"
              value={stats?.subDeptsCount ?? "—"}
              href="/supervisor/formations"
              icon={
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              }
            />
            <StatCard
              label="المعاملات الكلية"
              value={stats?.totalTransactions ?? "—"}
              href="/supervisor/transactions"
              icon={
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <StatCard
              label="المعاملات المنجزة"
              value={stats?.doneTransactions ?? "—"}
              href="/supervisor/transactions"
              icon={
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="قيد التنفيذ"
              value={stats?.pendingTransactions ?? "—"}
              icon={
                <svg className="h-5 w-5 text-[#B08D57]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="لا يمكن إنجازها"
              value={stats?.cannotCompleteCount ?? "—"}
              icon={
                <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              }
            />
            <StatCard
              label="عدد المخولين"
              value={stats?.delegateCount ?? "—"}
              href="/supervisor/delegates"
              icon={
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <StatCard
              label="النواب"
              value={stats?.parliamentMembersCount ?? "—"}
              href="/supervisor/parliament-members"
              icon={
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
          </div>
        )}
      </div>

      {/* ملخص المعاملات: اليوم، الأسبوع، الشهر */}
      {stats && !loading && (
        <div className="rounded-xl border border-[#c9d6e3] bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-base font-semibold text-[#1e3a5f] sm:text-lg">حجم المعاملات حسب الفترة</h2>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-lg border border-[#c9d6e3]/60 bg-[#f8fafc] p-3 text-center">
              <p className="text-xs font-medium text-[#5a6c7d]">اليوم</p>
              <p className="mt-1 text-xl font-bold text-[#1E6B3A]">{stats.transactionsToday}</p>
            </div>
            <div className="rounded-lg border border-[#c9d6e3]/60 bg-[#f8fafc] p-3 text-center">
              <p className="text-xs font-medium text-[#5a6c7d]">هذا الأسبوع</p>
              <p className="mt-1 text-xl font-bold text-[#1E6B3A]">{stats.transactionsThisWeek}</p>
            </div>
            <div className="rounded-lg border border-[#c9d6e3]/60 bg-[#f8fafc] p-3 text-center">
              <p className="text-xs font-medium text-[#5a6c7d]">هذا الشهر</p>
              <p className="mt-1 text-xl font-bold text-[#1E6B3A]">{stats.transactionsThisMonth}</p>
            </div>
          </div>
        </div>
      )}

      {/* الرسوم البيانية */}
      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        {/* رسم المكاتب ومعاملاتها */}
        <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm">
          <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-[#1e3a5f]">عمل المكاتب وعدد المعاملات</h2>
            <p className="mt-0.5 text-xs text-[#5a6c7d]">أعلى المكاتب من حيث عدد المعاملات</p>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="h-64 animate-pulse rounded-lg bg-[#f0f4f8]" />
            ) : officesChart.length > 0 ? (
              <div className="h-64 min-h-[256px] w-full min-w-[200px] sm:h-72">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 288 }}>
                  <BarChart data={officesChart} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number | undefined) => [value ?? 0, "عدد المعاملات"]}
                      labelFormatter={(label) => `المكتب: ${label}`}
                    />
                    <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} name="عدد المعاملات" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[#c9d6e3] bg-[#f8fafc] text-[#5a6c7d]">
                <p className="text-sm">لا توجد بيانات لعرضها</p>
              </div>
            )}
          </div>
        </div>

        {/* رسم المخولين وإنجازهم */}
        <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm">
          <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-[#1e3a5f]">المخولون وإنجاز المعاملات</h2>
            <p className="mt-0.5 text-xs text-[#5a6c7d]">أعلى المخولين من حيث المعاملات المنجزة</p>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="h-64 animate-pulse rounded-lg bg-[#f0f4f8]" />
            ) : delegatesChart.length > 0 ? (
              <div className="h-64 min-h-[256px] w-full min-w-[200px] sm:h-72">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 288 }}>
                  <BarChart data={delegatesChart} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number | undefined) => [value ?? 0, "منجزة"]}
                      labelFormatter={(label) => `المخول: ${label}`}
                    />
                    <Bar dataKey="value" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} name="منجزة" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[#c9d6e3] bg-[#f8fafc] text-[#5a6c7d]">
                <p className="text-sm">لا توجد بيانات لعرضها</p>
              </div>
            )}
          </div>
        </div>

        {/* الرسم الزمني + توزيع الحالة */}
        <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-[#1e3a5f]">حجم المعاملات خلال ٣٠ يوماً</h2>
            <p className="mt-0.5 text-xs text-[#5a6c7d]">المعاملات حسب تاريخ الإنشاء</p>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="h-56 animate-pulse rounded-lg bg-[#f0f4f8] sm:h-64" />
            ) : timelineChart.length > 0 ? (
              <div className="h-56 min-h-[224px] w-full min-w-[200px] sm:h-64">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 256 }}>
                  <AreaChart data={timelineChart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number | undefined) => [value ?? 0, "المعاملات"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={CHART_COLORS.primary}
                      fill="url(#timelineGrad)"
                      strokeWidth={2}
                      name="المعاملات"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[#c9d6e3] bg-[#f8fafc] text-[#5a6c7d]">
                <p className="text-sm">لا توجد بيانات لعرضها</p>
              </div>
            )}
          </div>
        </div>

        {/* توزيع حالة المعاملات (دائري) */}
        <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-[#1e3a5f]">توزيع حالة المعاملات</h2>
            <p className="mt-0.5 text-xs text-[#5a6c7d]">منجزة / قيد التنفيذ / لا يمكن إنجازها</p>
          </div>
          <div className="flex flex-col items-center justify-center p-4 sm:flex-row sm:gap-8 sm:p-6">
            {loading ? (
              <div className="h-48 w-48 animate-pulse rounded-full bg-[#f0f4f8]" />
            ) : statusPieData.length > 0 ? (
              <>
                <div className="h-48 min-h-[192px] w-48 min-w-[192px] shrink-0 sm:h-56 sm:w-56">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 192, height: 192 }}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {statusPieData.map((_, i) => (
                          <Cell key={i} fill={statusPieData[i].fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(value: number | undefined, name?: string) => [value ?? 0, name ?? ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-4 sm:mt-0">
                  {statusPieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: d.fill }}
                      />
                      <span className="text-sm text-[#1B1B1B]">
                        {d.name}: <strong>{d.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-[#5a6c7d]">
                <p className="text-sm">لا توجد معاملات</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* بطاقات الوصول السريع */}
      <div className="rounded-xl border border-[#c9d6e3] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-[#1e3a5f]">الوصول السريع</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/supervisor/offices"
            className="flex items-center gap-3 rounded-lg border border-[#c9d6e3] p-4 transition hover:border-[#1E6B3A]/30 hover:bg-[#1E6B3A]/5"
          >
            <svg className="h-8 w-8 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="font-medium text-[#1B1B1B]">عرض المكاتب</span>
          </Link>
          <Link
            href="/supervisor/transactions"
            className="flex items-center gap-3 rounded-lg border border-[#c9d6e3] p-4 transition hover:border-[#1E6B3A]/30 hover:bg-[#1E6B3A]/5"
          >
            <svg className="h-8 w-8 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium text-[#1B1B1B]">المعاملات</span>
          </Link>
          <Link
            href="/supervisor/delegates"
            className="flex items-center gap-3 rounded-lg border border-[#c9d6e3] p-4 transition hover:border-[#1E6B3A]/30 hover:bg-[#1E6B3A]/5"
          >
            <svg className="h-8 w-8 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium text-[#1B1B1B]">المخولون</span>
          </Link>
          <Link
            href="/supervisor/formations"
            className="flex items-center gap-3 rounded-lg border border-[#c9d6e3] p-4 transition hover:border-[#1E6B3A]/30 hover:bg-[#1E6B3A]/5"
          >
            <svg className="h-8 w-8 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="font-medium text-[#1B1B1B]">التشكيلات</span>
          </Link>
          <Link
            href="/supervisor/parliament-members"
            className="flex items-center gap-3 rounded-lg border border-[#c9d6e3] p-4 transition hover:border-[#1E6B3A]/30 hover:bg-[#1E6B3A]/5"
          >
            <svg className="h-8 w-8 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium text-[#1B1B1B]">أعضاء مجلس النواب</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
