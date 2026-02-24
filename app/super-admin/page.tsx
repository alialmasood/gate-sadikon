"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
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

type Stats = {
  userCount: number;
  officeCount: number;
  delegateCount: number;
  totalTransactions: number;
  transactionsToday: number;
  completionRate: number;
  avgCompletionMinutes: number | null;
  overdueCount: number;
  mostActiveOffice: string | null;
  systemStatus?: "excellent" | "good" | "needs_intervention";
  top3OfficesThisMonth?: { name: string; count: number }[];
  alerts?: {
    slaExceeded: { id: string; citizenName: string | null; officeName: string }[];
    inactiveOffices: { id: string; name: string }[];
    inactiveUsers: { id: string; name: string }[];
  };
  comparison?: {
    userCountDelta: number;
    officeCountDelta: number;
    delegateCountDelta: number;
    totalTransactionsDelta: number;
    transactionsTodayDelta: number;
    overdueDelta: number;
    completionRateDelta: number;
  };
};

type Office = { id: string; name: string };
type TimelinePoint = { date: string; count: number };
type StatusPoint = { name: string; value: number; fill: string };
type ComparisonPoint = { name: string; value: number };
type ActivityItem = {
  id: string;
  citizenName: string | null;
  officeName: string;
  status: string;
  actionType: string;
  executor: string;
  createdAt: string;
  completedAt: string | null;
};

const PERIOD_OPTIONS = [
  { value: "day", label: "اليوم" },
  { value: "week", label: "أسبوع" },
  { value: "months:30", label: "شهر" },
  { value: "custom", label: "مخصص" },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  إنشاء: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  تعديل: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  إغلاق: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  حذف: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  إضافة: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  إنجاز: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  تحذير: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const SYSTEM_STATUS_CONFIG = {
  excellent: { label: "ممتاز", gradient: "from-[#1E6B3A]/15 via-[#1E6B3A]/10 to-[#1E6B3A]/5", border: "border-[#1E6B3A]/30", text: "text-[#1E6B3A]" },
  good: { label: "جيد", gradient: "from-[#B08D57]/12 via-[#B08D57]/8 to-[#B08D57]/4", border: "border-[#B08D57]/30", text: "text-[#8B6914]" },
  needs_intervention: { label: "يحتاج تدخل", gradient: "from-amber-500/15 via-amber-500/10 to-amber-500/5", border: "border-amber-500/40", text: "text-amber-700" },
};

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffH < 24) return `منذ ${diffH} ساعة`;
  if (diffD < 7) return `منذ ${diffD} يوم`;
  return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "short", numberingSystem: "arab" }).format(d);
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-sm text-[#5a5a5a]">—</span>;
  const isPositive = delta > 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
    >
      {isPositive ? "↑" : "↓"} {Math.abs(delta)}%
    </span>
  );
}

function EmptyChart({
  icon,
  title,
  subtitle,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="flex h-36 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#e5e5e5] bg-[#FAFAF9] py-4">
      <span className="text-[#B08D57]/70">{icon}</span>
      <div className="text-center">
        <p className="text-sm font-medium text-[#1B1B1B]">{title}</p>
        <p className="mt-0.5 text-xs text-[#5a5a5a]">{subtitle}</p>
      </div>
      <Link
        href={actionHref}
        className="rounded-lg bg-[#1E6B3A]/90 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#175a2e]"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

const CHART_ICON = (
  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CARD_HEIGHT_PRIMARY = "min-h-[150px]";
const CARD_HEIGHT_SECONDARY = "min-h-[110px]";
const BORDER_RADIUS = "rounded-xl";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("months:30");
  const [officeId, setOfficeId] = useState<string>("");
  const [offices, setOffices] = useState<Office[]>([]);
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [statusData, setStatusData] = useState<StatusPoint[]>([]);
  const [officesChartData, setOfficesChartData] = useState<ComparisonPoint[]>([]);
  const [delegatesChartData, setDelegatesChartData] = useState<ComparisonPoint[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      //
    }
  }, []);

  const loadOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/offices");
      if (res.ok) {
        const list = await res.json();
        setOffices(list);
      }
    } catch {
      //
    }
  }, []);

  const loadCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const [timelineRes, statusRes, activityRes, officesRes, delegatesRes] = await Promise.all([
        fetch(`/api/super-admin/charts?chart=timeline&period=${period}${officeId ? `&officeId=${officeId}` : ""}`),
        fetch(`/api/super-admin/charts?chart=status${officeId ? `&officeId=${officeId}` : ""}`),
        fetch(`/api/super-admin/charts?chart=activity${officeId ? `&officeId=${officeId}` : ""}`),
        fetch(`/api/super-admin/charts?chart=offices${officeId ? `&officeId=${officeId}` : ""}`),
        fetch(`/api/super-admin/charts?chart=delegates&period=${period}${officeId ? `&officeId=${officeId}` : ""}`),
      ]);
      if (timelineRes.ok) setTimelineData(await timelineRes.json());
      if (statusRes.ok) setStatusData(await statusRes.json());
      if (activityRes.ok) setActivity(await activityRes.json());
      if (officesRes.ok) setOfficesChartData(await officesRes.json());
      if (delegatesRes.ok) setDelegatesChartData(await delegatesRes.json());
    } catch {
      //
    } finally {
      setChartsLoading(false);
    }
  }, [period, officeId]);

  const refresh = useCallback(() => {
    setLoading(true);
    loadStats().finally(() => setLoading(false));
    loadCharts();
  }, [loadStats, loadCharts]);

  useEffect(() => {
    setLoading(true);
    loadStats().finally(() => setLoading(false));
  }, [loadStats]);

  useEffect(() => {
    loadOffices();
  }, [loadOffices]);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return new Intl.DateTimeFormat("ar-IQ", { month: "short", day: "numeric", numberingSystem: "arab" }).format(date);
  };

  const formatTime = (d: string) => {
    return new Intl.DateTimeFormat("ar-IQ", { timeStyle: "short", numberingSystem: "arab" }).format(new Date(d));
  };

  const comp = stats?.comparison;
  const statusConfig = stats?.systemStatus ? SYSTEM_STATUS_CONFIG[stats.systemStatus] : SYSTEM_STATUS_CONFIG.good;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => p.value !== "custom" && setPeriod(p.value)}
              disabled={p.value === "custom"}
              className={`${BORDER_RADIUS} px-4 py-2 text-base font-medium transition ${
                period === p.value ? "bg-[#1E6B3A] text-white" : "border border-[#e5e5e5] bg-white text-[#1B1B1B] hover:bg-[#f9f9f9]"
              } ${p.value === "custom" ? "opacity-60" : ""}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select
          value={officeId}
          onChange={(e) => setOfficeId(e.target.value)}
          className={`${BORDER_RADIUS} border border-[#e5e5e5] bg-white px-3 py-2 text-base text-[#1B1B1B] focus:border-[#1E6B3A]/50 focus:outline-none focus:ring-2 focus:ring-[#1E6B3A]/20`}
        >
          <option value="">جميع المكاتب</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={refresh}
          className={`flex items-center gap-2 ${BORDER_RADIUS} border border-[#e5e5e5] bg-white px-4 py-2 text-base font-medium text-[#1B1B1B] transition hover:bg-[#f9f9f9]`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          تحديث
        </button>
      </div>

      {/* مؤشر أداء النظام — gradient خفيف، تقسيم يمين/يسار، دائرة */}
      <section className={`${BORDER_RADIUS} border bg-gradient-to-b ${statusConfig.gradient} ${statusConfig.border} px-4 py-3.5`}>
        <div className="flex items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#5a5a5a]">الحالة العامة</p>
              <p className={`text-[28px] font-semibold ${statusConfig.text}`}>{statusConfig.label}</p>
            </div>
            <div className="h-8 w-px bg-[#e0e0e0]" />
            <div>
              <p className="text-xs text-[#5a5a5a]">نسبة الإنجاز</p>
              <p className="text-[22px] font-semibold text-[#1B1B1B]">{(stats?.completionRate ?? 0)}%</p>
            </div>
            <div>
              <p className="text-xs text-[#5a5a5a]">المتأخرات</p>
              <p className="text-[22px] font-semibold text-[#1B1B1B]">{stats?.overdueCount ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-[#5a5a5a]">SLA</p>
              <p className="text-[22px] font-semibold text-[#1B1B1B]">{stats?.avgCompletionMinutes != null ? `${stats.avgCompletionMinutes} د` : "—"}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative h-12 w-12">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" stroke="#e5e5e5" strokeWidth="3" fill="none" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="#1E6B3A"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={2 * Math.PI * 16 * (1 - (stats?.completionRate ?? 0) / 100)}
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-[#5a5a5a]">عن الفترة السابقة</p>
              <DeltaBadge delta={comp?.completionRateDelta ?? 0} />
            </div>
          </div>
        </div>
      </section>

      {/* KPI Row 1 - الرئيسية أكبر */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {loading && !stats
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${BORDER_RADIUS} border border-[#e5e5e5] bg-white p-5 shadow-sm ${CARD_HEIGHT_PRIMARY}`}>
                <div className="h-4 w-24 animate-pulse rounded bg-[#e8dfcf]" />
                <div className="mt-2 h-8 w-16 animate-pulse rounded bg-[#e8dfcf]" />
              </div>
            ))
          : [
              {
                label: "إجمالي المستخدمين",
                value: stats?.userCount ?? 0,
                delta: comp?.userCountDelta ?? 0,
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ),
              },
              {
                label: "عدد المكاتب",
                value: stats?.officeCount ?? 0,
                delta: comp?.officeCountDelta ?? 0,
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
              },
              {
                label: "عدد المخولين المسجلين",
                value: stats?.delegateCount ?? 0,
                delta: comp?.delegateCountDelta ?? 0,
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                label: "إجمالي المعاملات الكلية",
                value: stats?.totalTransactions ?? 0,
                delta: comp?.totalTransactionsDelta ?? 0,
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
              },
              {
                label: "معاملات اليوم",
                value: stats?.transactionsToday ?? 0,
                delta: comp?.transactionsTodayDelta ?? 0,
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
              },
              {
                label: "المعاملات المتأخرة",
                value: stats?.overdueCount ?? 0,
                delta: comp?.overdueDelta ?? 0,
                invertDelta: true,
                icon: (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                isWarning: true,
              },
            ].map((k) => (
              <div
                key={k.label}
                className={`flex flex-col ${BORDER_RADIUS} border border-[#e5e5e5] bg-white p-5 shadow-sm transition hover:shadow-md ${CARD_HEIGHT_PRIMARY} ${
                  k.isWarning && (stats?.overdueCount ?? 0) > 0 ? "border-amber-200 bg-amber-50/50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-[#5a5a5a]">{k.label}</span>
                  <span className={`${k.isWarning && (stats?.overdueCount ?? 0) > 0 ? "text-amber-600" : "text-[#B08D57]/80"}`}>{k.icon}</span>
                </div>
                <p className={`mt-2 text-[34px] font-bold leading-tight ${k.isWarning && (stats?.overdueCount ?? 0) > 0 ? "text-amber-700" : "text-[#1B1B1B]"}`}>
                  {k.value}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-[#5a5a5a]">
                  <DeltaBadge delta={k.isWarning ? -(k.delta ?? 0) : (k.delta ?? 0)} />
                  <span>عن الشهر الماضي</span>
                </p>
              </div>
            ))}
      </section>

      {/* KPI Row 2 - الثانوية أصغر 15% */}
      <section className="grid gap-3 sm:grid-cols-3">
        {loading && !stats ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${BORDER_RADIUS} border border-[#e5e5e5] bg-white p-3.5 shadow-sm ${CARD_HEIGHT_SECONDARY}`}>
              <div className="h-4 w-28 animate-pulse rounded bg-[#e8dfcf]" />
              <div className="mt-2 h-6 w-20 animate-pulse rounded bg-[#e8dfcf]" />
              <div className="mt-3 h-2 w-full animate-pulse rounded bg-[#e8dfcf]" />
            </div>
          ))
        ) : (
          <>
            <div className={`flex flex-col ${BORDER_RADIUS} border border-[#e5e5e5] bg-white p-3.5 shadow-sm ${CARD_HEIGHT_SECONDARY}`}>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#5a5a5a]">نسبة الإنجاز</span>
                <span className="text-[#1E6B3A]/70">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="relative h-10 w-10 shrink-0">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" stroke="#f0f0f0" strokeWidth="3" fill="none" />
                    <circle cx="18" cy="18" r="14" stroke="#1E6B3A" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 14} strokeDashoffset={2 * Math.PI * 14 * (1 - (stats?.completionRate ?? 0) / 100)} />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1B1B1B]">{(stats?.completionRate ?? 0)}%</p>
                  <DeltaBadge delta={comp?.completionRateDelta ?? 0} />
                </div>
              </div>
            </div>
            <div className={`flex flex-col ${BORDER_RADIUS} border border-[#e5e5e5] bg-white p-3.5 shadow-sm ${CARD_HEIGHT_SECONDARY}`}>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#5a5a5a]">متوسط زمن الإنجاز (SLA)</span>
                <span className="text-[#B08D57]/70">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#1B1B1B]">
                  {stats?.avgCompletionMinutes != null ? `${stats.avgCompletionMinutes} د` : "—"}
                </p>
                <DeltaBadge delta={0} />
              </div>
            </div>
            <div className={`flex flex-col ${BORDER_RADIUS} border border-[#e5e5e5] bg-white p-3.5 shadow-sm ${CARD_HEIGHT_SECONDARY}`}>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#5a5a5a]">أكثر مكتب نشاطاً</span>
                <span className="text-[#1E6B3A]/70">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="truncate text-2xl font-bold text-[#1B1B1B]">{stats?.mostActiveOffice || "—"}</p>
                <DeltaBadge delta={0} />
              </div>
            </div>
          </>
        )}
      </section>

      {/* مقارنة للمكاتب + مقارنة المخولين */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`flex min-h-[200px] flex-col ${BORDER_RADIUS} border border-[#e5e5e5] bg-white p-3.5 shadow-sm`}>
          <h3 className="mb-2.5 text-base font-semibold text-[#1B1B1B]">مقارنة المكاتب (معاملات منجزة)</h3>
          {chartsLoading ? (
            <div className="flex min-h-[180px] flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#B08D57]/50 border-t-transparent" />
            </div>
          ) : officesChartData.length > 0 ? (
            <div className="h-52 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={officesChartData} layout="vertical" margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#555" }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#555" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: 13 }}
                    formatter={(v: number | undefined) => [`${v ?? 0} معاملة`, "عدد المعاملات"]}
                  />
                  <Bar dataKey="value" name="عدد المعاملات" fill="#1E6B3A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#e5e5e5] bg-[#FAFAF9] py-4">
              <span className="text-[#B08D57]/50">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              <p className="text-sm text-[#5a5a5a]">لا توجد بيانات للمقارنة</p>
            </div>
          )}
        </div>
        <div className={`flex min-h-[200px] flex-col ${BORDER_RADIUS} border border-[#e5e5e5] bg-white p-3.5 shadow-sm`}>
          <h3 className="mb-2.5 text-base font-semibold text-[#1B1B1B]">مقارنة المخولين (الفترة الحالية)</h3>
          {chartsLoading ? (
            <div className="flex min-h-[180px] flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#B08D57]/50 border-t-transparent" />
            </div>
          ) : delegatesChartData.length > 0 ? (
            <div className="h-52 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={delegatesChartData} layout="vertical" margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#555" }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#555" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: 13 }}
                    formatter={(v: number | undefined) => [`${v ?? 0} معاملة`, "عدد المعاملات"]}
                  />
                  <Bar dataKey="value" name="عدد المعاملات" fill="#B08D57" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#e5e5e5] bg-[#FAFAF9] py-4">
              <span className="text-[#B08D57]/50">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <p className="text-sm text-[#5a5a5a]">لا توجد بيانات للمقارنة</p>
            </div>
          )}
        </div>
      </section>

      {/* تنبيهات إدارية + أفضل 3 مكاتب */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className={`flex flex-col ${BORDER_RADIUS} border border-amber-200/60 bg-amber-50/30 p-3.5 shadow-sm ${CARD_HEIGHT_SECONDARY}`}>
          <h3 className="mb-2.5 flex items-center gap-2 text-base font-semibold text-[#1B1B1B]">
            <span className="text-amber-600/80">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </span>
            تنبيهات إدارية
          </h3>
          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {stats?.alerts?.slaExceeded?.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg bg-white/70 px-2.5 py-1.5">
                <span className="text-red-500">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <span className="flex-1 truncate text-sm text-[#1B1B1B]">{t.citizenName || "—"} — {t.officeName}</span>
              </div>
            ))}
            {stats?.alerts?.inactiveOffices?.slice(0, 3).map((o) => (
              <div key={o.id} className="flex items-center gap-2 rounded-lg bg-white/70 px-2.5 py-1.5">
                <span className="text-amber-600">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
                <span className="flex-1 truncate text-sm text-[#1B1B1B]">{o.name}</span>
              </div>
            ))}
            {stats?.alerts?.inactiveUsers?.slice(0, 3).map((u) => (
              <div key={u.id} className="flex items-center gap-2 rounded-lg bg-white/70 px-2.5 py-1.5">
                <span className="text-[#5a5a5a]">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <span className="flex-1 truncate text-sm text-[#1B1B1B]">{u.name}</span>
              </div>
            ))}
            {(!stats?.alerts?.slaExceeded?.length && !stats?.alerts?.inactiveOffices?.length && !stats?.alerts?.inactiveUsers?.length) && (
              <p className="py-1 text-sm text-[#5a5a5a]">لا توجد تنبيهات</p>
            )}
          </div>
        </div>

        <div className={`flex flex-col ${BORDER_RADIUS} border border-[#e5e5e5] bg-white p-3.5 shadow-sm ${CARD_HEIGHT_SECONDARY}`}>
          <h3 className="mb-2.5 text-base font-semibold text-[#1B1B1B]">أفضل 3 مكاتب هذا الشهر</h3>
          <div className="flex-1 space-y-1.5">
            {(stats?.top3OfficesThisMonth ?? []).length > 0 ? (
              (() => {
                const maxCount = Math.max(...stats!.top3OfficesThisMonth!.map((x) => x.count), 1);
                return stats!.top3OfficesThisMonth!.map((o, i) => (
                    <div key={o.name} className="rounded-lg border border-[#eee] bg-[#FAFAF9] px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base">{["🥇", "🥈", "🥉"][i]}</span>
                      <span className="flex-1 truncate text-[15px] font-medium text-[#1B1B1B]">{o.name}</span>
                      <span className="text-lg font-bold text-[#1E6B3A]/80">{o.count}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#e8e8e8]">
                      <div className="h-full rounded-full bg-[#1E6B3A]/40" style={{ width: `${(o.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                ));
              })()
            ) : (
              <p className="py-2 text-sm text-[#5a5a5a]">لا توجد بيانات</p>
            )}
          </div>
        </div>
      </section>

      {/* Charts + Activity */}
      <section className="grid gap-4 lg:grid-cols-1 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className={`flex min-h-[170px] flex-col ${BORDER_RADIUS} border border-[#e5e5e5] bg-white p-3.5 shadow-sm`}>
            <h3 className="mb-2.5 text-base font-semibold text-[#1B1B1B]">معاملات عبر الزمن (آخر 30 يوم)</h3>
            {chartsLoading ? (
              <div className="flex min-h-[150px] flex-1 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#B08D57]/50 border-t-transparent" />
              </div>
            ) : timelineData.length > 0 ? (
              <div className="h-48 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1E6B3A" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#1E6B3A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={(v) => formatDate(v)} tick={{ fontSize: 12, fill: "#555" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#555" }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: 14 }}
                      labelFormatter={(v) => formatDate(v)}
                      formatter={(v: number | undefined) => [`${v ?? 0} معاملة`, "عدد المعاملات"]}
                    />
                    <Area type="monotone" dataKey="count" name="عدد المعاملات" stroke="#1E6B3A" strokeWidth={1.5} fill="url(#areaGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart
                icon={CHART_ICON}
                title="لا توجد معاملات"
                subtitle="لم يتم تسجيل أي معاملات في الفترة المحددة"
                actionLabel="إضافة مكتب"
                actionHref="/super-admin/offices"
              />
            )}
          </div>

          <div className={`flex min-h-[170px] flex-col ${BORDER_RADIUS} border border-[#e5e5e5] bg-white p-3.5 shadow-sm`}>
            <h3 className="mb-2.5 text-base font-semibold text-[#1B1B1B]">توزيع الحالات</h3>
            {chartsLoading ? (
              <div className="flex min-h-[150px] flex-1 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#B08D57]/50 border-t-transparent" />
              </div>
            ) : statusData.length > 0 && statusData.some((d) => d.value > 0) ? (
              <div className="flex flex-1 flex-col">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ bottom: 20 }}>
                      <Pie data={statusData} cx="50%" cy="45%" innerRadius={40} outerRadius={60} paddingAngle={1} dataKey="value">
                        {statusData.map((_, i) => (
                          <Cell key={i} fill={statusData[i].fill} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 14 }} formatter={(v: number | undefined, n: string | undefined, p: { payload?: StatusPoint }) => [`${v ?? 0}`, p?.payload?.name ?? n ?? ""]} />
                      <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} iconType="circle" iconSize={8} fontSize={13} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <EmptyChart
                icon={CHART_ICON}
                title="لا توجد بيانات"
                subtitle="لم يتم تسجيل معاملات ذات حالات مختلفة"
                actionLabel="إنشاء مستخدم"
                actionHref="/super-admin/users"
              />
            )}
          </div>
        </div>

        {/* آخر النشاط — Timeline عمودي */}
        <div className="flex min-h-[180px] flex-col rounded-xl border border-[#e5e5e5] bg-white p-3.5 shadow-sm">
          <h3 className="mb-2.5 text-base font-semibold text-[#1B1B1B]">آخر النشاط</h3>
          {chartsLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#B08D57]/50 border-t-transparent" />
            </div>
          ) : activity.length > 0 ? (
            <div className="relative flex-1">
              <div className="absolute right-[9px] top-1 bottom-1 w-px bg-[#e8e8e8]" />
              <div className="space-y-0">
                {activity.map((a) => (
                  <div key={a.id} className="relative flex items-start gap-2.5 py-1.5">
                    <span
                      className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white bg-white ${
                        a.actionType === "إنجاز" ? "text-green-600/80" : a.actionType === "تحذير" ? "text-red-500/80" : "text-[#B08D57]/80"
                      }`}
                    >
                      {ACTION_ICONS[a.actionType] ?? ACTION_ICONS.إضافة}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1B1B1B]">{a.actionType} — {a.citizenName || "—"}</p>
                      <p className="text-xs text-[#5a5a5a]">{a.executor} · {formatRelativeTime(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[100px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#e5e5e5] bg-[#FAFAF9] py-3">
              <span className="text-[#B08D57]/50">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <p className="text-sm text-[#5a5a5a]">لا توجد معاملات حديثة</p>
            </div>
          )}
        </div>
      </section>

      {/* إجراءات سريعة — بطاقات مصغرة */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-[#1B1B1B]">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { href: "/super-admin/users", label: "إنشاء مستخدم", desc: "إضافة مستخدم جديد للنظام", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3z" },
            { href: "/super-admin/offices", label: "إضافة مكتب", desc: "تسجيل مكتب أو جهة جديدة", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
            { href: "/super-admin/reports", label: "التقارير", desc: "عرض وتصدير التقارير", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
            { href: "/super-admin/reports", label: "المتأخرات", desc: "معاملات تحتاج متابعة", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-[#e5e5e5] bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#1E6B3A]/30 hover:shadow-md"
            >
              <span className="text-[#1E6B3A]/80">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon} />
                </svg>
              </span>
              <span className="text-center text-sm font-medium text-[#1B1B1B]">{a.label}</span>
              <span className="text-center text-xs text-[#5a5a5a] leading-tight">{a.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
