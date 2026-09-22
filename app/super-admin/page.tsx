"use client";

import { useEffect, useState, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
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
} from "recharts";

type Stats = {
  userCount: number;
  officeCount: number;
  adminAccountsCount?: number;
  parliamentMembersCount?: number;
  formationsCount?: number;
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
  excellent: { label: "ممتاز", gradient: "from-[#1E6B3A]/8 via-white to-white", border: "border-[#E6EAF0]", text: "text-[#027A48]" },
  good: { label: "جيد", gradient: "from-[#1e3a5f]/6 via-white to-white", border: "border-[#E6EAF0]", text: "text-[#1e3a5f]" },
  needs_intervention: { label: "يحتاج تدخل", gradient: "from-amber-50 via-white to-white", border: "border-[#E6EAF0]", text: "text-amber-700" },
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
  if (delta === 0) return <span className="text-sm text-[#98A2B3]">—</span>;
  const isPositive = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isPositive ? "bg-[#ECFDF3] text-[#027A48]" : "bg-[#FEF3F2] text-[#B42318]"
      }`}
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
    <div className="flex h-36 flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#F6F8FB] py-4">
      <span className="text-[#98A2B3]">{icon}</span>
      <div className="text-center">
        <p className="text-sm font-medium text-[#101828]">{title}</p>
        <p className="mt-0.5 text-xs text-[#667085]">{subtitle}</p>
      </div>
      <Link
        href={actionHref}
        className="rounded-xl bg-[#1e3a5f] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#152d47]"
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
const CARD =
  "rounded-2xl border border-[#E6EAF0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
const ACCENT_NAVY = "#1e3a5f";
const ACCENT_GREEN = "#027A48";

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
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/stats", { credentials: "include" });
      if (res.ok) setStats(await res.json());
    } catch {
      //
    }
  }, []);

  const loadOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/offices", { credentials: "include" });
      if (res.ok) {
        const list = await res.json();
        setOffices(list);
      }
    } catch {
      //
    }
  }, []);

  const loadCharts = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setChartsLoading(true);
      setTimelineError(null);
    }
    const opts = { credentials: "include" as RequestCredentials };
    try {
      const [timelineRes, statusRes, activityRes, officesRes, delegatesRes] = await Promise.all([
        fetch(`/api/super-admin/charts?chart=timeline&period=${period}${officeId ? `&officeId=${officeId}` : ""}`, opts),
        fetch(`/api/super-admin/charts?chart=status${officeId ? `&officeId=${officeId}` : ""}`, opts),
        fetch(`/api/super-admin/charts?chart=activity${officeId ? `&officeId=${officeId}` : ""}`, opts),
        fetch(`/api/super-admin/charts?chart=offices${officeId ? `&officeId=${officeId}` : ""}`, opts),
        fetch(`/api/super-admin/charts?chart=delegates&period=${period}${officeId ? `&officeId=${officeId}` : ""}`, opts),
      ]);
      if (timelineRes.ok) {
        const data = await timelineRes.json();
        setTimelineError(null);
        setTimelineData(Array.isArray(data) ? data : []);
      } else {
        const err = await timelineRes.text().catch(() => "");
        setTimelineError(`تحميل الفترة الزمنية فشل (${timelineRes.status})${err ? `: ${err.slice(0, 80)}` : ""}`);
      }
      if (statusRes.ok) setStatusData(await statusRes.json());
      if (activityRes.ok) setActivity(await activityRes.json());
      if (officesRes.ok) setOfficesChartData(await officesRes.json());
      if (delegatesRes.ok) setDelegatesChartData(await delegatesRes.json());
    } catch {
      //
    } finally {
      if (!silent) setChartsLoading(false);
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

  useAutoRefresh(() => {
    loadStats();
    loadCharts({ silent: true });
  });

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
    <div className="min-h-full pb-8" dir="rtl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828] sm:text-[28px]">لوحة تحكم الإدارة العليا</h1>
          <p className="mt-1.5 text-sm text-[#667085]">متابعة أداء النظام والإحصائيات الشاملة</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1e3a5f]/8">
          <svg className="h-5 w-5 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>

      <div className="space-y-5">
      <section className={`${CARD} flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[#667085]">الفترة:</span>
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                period === p.value ? "bg-[#1e3a5f] text-white" : "bg-[#F6F8FB] text-[#344054] hover:bg-[#EEF2F6]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select
          value={officeId}
          onChange={(e) => setOfficeId(e.target.value)}
          className="min-h-10 w-full rounded-xl bg-[#F6F8FB] px-3 py-2 text-sm text-[#101828] outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 sm:w-auto"
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
          className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#F6F8FB] px-4 py-2 text-sm font-medium text-[#344054] transition hover:bg-[#EEF2F6]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          تحديث
        </button>
      </section>

      {/* مؤشر أداء النظام */}
      <section className={`${CARD} bg-gradient-to-l ${statusConfig.gradient} px-5 py-5`}>
        <p className="mb-4 text-xs text-[#667085]">
          مؤشر يُحسب من إجمالي المعاملات: نسبة المنجزة، المتأخرات، ومتوسط زمن الإنجاز
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-wrap items-center gap-4 sm:gap-8">
            <div>
              <p className="text-xs font-medium text-[#667085]" title="مؤشر تركيبي يعتمد على المتأخرات ونسبة الإنجاز وSLA">الحالة العامة</p>
              <p className={`mt-1 text-[28px] font-semibold ${statusConfig.text}`}>{statusConfig.label}</p>
            </div>
            <div className="hidden h-10 w-px bg-[#E6EAF0] sm:block" />
            <div>
              <p className="text-xs text-[#667085]" title="نسبة المعاملات المنجزة من إجمالي المعاملات">نسبة الإنجاز</p>
              <p className="mt-1 text-[22px] font-semibold text-[#101828]">{(stats?.completionRate ?? 0)}%</p>
            </div>
            <div>
              <p className="text-xs text-[#667085]" title="عدد المعاملات التي تجاوزت المدة ولم تُنجز">المتأخرات</p>
              <p className="mt-1 text-[22px] font-semibold text-[#101828]">{stats?.overdueCount ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-[#667085]" title="متوسط الزمن بالدقائق من الإنشاء حتى الإنجاز">SLA</p>
              <p className="mt-1 text-[22px] font-semibold text-[#101828]">{stats?.avgCompletionMinutes != null ? `${stats.avgCompletionMinutes} د` : "—"}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative h-12 w-12">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" stroke="#E6EAF0" strokeWidth="3" fill="none" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke={ACCENT_GREEN}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={2 * Math.PI * 16 * (1 - (stats?.completionRate ?? 0) / 100)}
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-[#667085]">عن الفترة السابقة</p>
              <DeltaBadge delta={comp?.completionRateDelta ?? 0} />
            </div>
          </div>
        </div>
      </section>

      {/* بطاقات المؤشرات الرئيسية */}
      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {loading && !stats
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${CARD} p-5 ${CARD_HEIGHT_PRIMARY}`}>
                <div className="h-4 w-24 animate-pulse rounded bg-[#EEF2F6]" />
                <div className="mt-2 h-8 w-16 animate-pulse rounded bg-[#EEF2F6]" />
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
                className={`flex flex-col ${CARD} p-5 transition hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] ${CARD_HEIGHT_PRIMARY} ${
                  k.isWarning && (stats?.overdueCount ?? 0) > 0 ? "border-amber-200 bg-amber-50/70" : ""
                }`}
              >
                <div className="flex min-h-[2.5rem] items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-[#667085]">{k.label}</span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${k.isWarning && (stats?.overdueCount ?? 0) > 0 ? "bg-amber-100 text-amber-600" : "bg-[#F6F8FB] text-[#1e3a5f]"}`}>{k.icon}</span>
                </div>
                <p className={`mt-3 text-[32px] font-semibold leading-none ${k.isWarning && (stats?.overdueCount ?? 0) > 0 ? "text-amber-700" : "text-[#101828]"}`}>
                  {k.value}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-[#667085]">
                  <DeltaBadge delta={k.isWarning ? -(k.delta ?? 0) : (k.delta ?? 0)} />
                  <span className="whitespace-nowrap">عن الشهر الماضي</span>
                </p>
              </div>
            ))}
      </section>

      {/* بطاقات حسابات الإداريين وأعضاء مجلس النواب والتشكيلات */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/super-admin/users"
          className={`flex flex-col ${CARD} p-5 transition hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] ${CARD_HEIGHT_PRIMARY}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#667085]">عدد حسابات الإداريين</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F6F8FB] text-[#1e3a5f]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-[32px] font-semibold leading-none text-[#101828]">
            {loading && !stats ? "—" : (stats?.adminAccountsCount ?? 0)}
          </p>
          <p className="mt-0.5 text-sm text-[#667085]">من صفحة حسابات المستخدمين</p>
        </Link>
        <Link
          href="/super-admin/parliament-members"
          className={`flex flex-col ${CARD} p-5 transition hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] ${CARD_HEIGHT_PRIMARY}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#667085]">عدد حسابات أعضاء مجلس النواب</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F6F8FB] text-[#1e3a5f]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-[32px] font-semibold leading-none text-[#101828]">
            {loading && !stats ? "—" : (stats?.parliamentMembersCount ?? 0)}
          </p>
          <p className="mt-0.5 text-sm text-[#667085]">من صفحة شؤون أعضاء مجلس النواب</p>
        </Link>
        <Link
          href="/super-admin/ministries"
          className={`flex flex-col ${CARD} p-5 transition hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] ${CARD_HEIGHT_PRIMARY}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#667085]">عدد التشكيلات / الوزارات / الدوائر</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F6F8FB] text-[#1e3a5f]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
          </div>
          <p className="mt-3 text-[32px] font-semibold leading-none text-[#101828]">
            {loading && !stats ? "—" : (stats?.formationsCount ?? 0)}
          </p>
          <p className="mt-0.5 text-sm text-[#667085]">من صفحة التشكيلات والوزارات</p>
        </Link>
      </section>

      {/* المؤشرات الثانوية */}
      <section className="grid gap-4 sm:grid-cols-3">
        {loading && !stats ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${CARD} p-4 ${CARD_HEIGHT_SECONDARY}`}>
              <div className="h-4 w-28 animate-pulse rounded bg-[#EEF2F6]" />
              <div className="mt-2 h-6 w-20 animate-pulse rounded bg-[#EEF2F6]" />
              <div className="mt-3 h-2 w-full animate-pulse rounded bg-[#EEF2F6]" />
            </div>
          ))
        ) : (
          <>
            <div className={`flex flex-col ${CARD} p-4 ${CARD_HEIGHT_SECONDARY}`}>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#667085]">نسبة الإنجاز</span>
                <span className="text-[#027A48]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="relative h-10 w-10 shrink-0">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" stroke="#f0f0f0" strokeWidth="3" fill="none" />
                    <circle cx="18" cy="18" r="14" stroke={ACCENT_GREEN} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 14} strokeDashoffset={2 * Math.PI * 14 * (1 - (stats?.completionRate ?? 0) / 100)} />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#101828]">{(stats?.completionRate ?? 0)}%</p>
                  <DeltaBadge delta={comp?.completionRateDelta ?? 0} />
                </div>
              </div>
            </div>
            <div className={`flex flex-col ${CARD} p-4 ${CARD_HEIGHT_SECONDARY}`}>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#667085]">متوسط زمن الإنجاز (SLA)</span>
                <span className="text-[#1e3a5f]/70">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-2xl font-bold text-[#101828]">
                  {stats?.avgCompletionMinutes != null ? `${stats.avgCompletionMinutes} د` : "—"}
                </p>
                <DeltaBadge delta={0} />
              </div>
            </div>
            <div className={`flex flex-col ${CARD} p-4 ${CARD_HEIGHT_SECONDARY}`}>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#667085]">أكثر مكتب نشاطاً</span>
                <span className="text-[#027A48]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="truncate text-2xl font-bold text-[#101828]">{stats?.mostActiveOffice || "—"}</p>
                <DeltaBadge delta={0} />
              </div>
            </div>
          </>
        )}
      </section>

      {/* مقارنة للمكاتب + مقارنة المخولين */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`flex min-h-[200px] flex-col ${CARD} p-5`}>
          <h3 className="mb-3 text-sm font-semibold text-[#101828]">مقارنة المكاتب (معاملات منجزة)</h3>
          {chartsLoading ? (
            <div className="flex min-h-[180px] flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f]/25 border-t-transparent" />
            </div>
          ) : officesChartData.length > 0 ? (
            <div className="min-h-[208px] w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={208} minHeight={208}>
                <BarChart data={officesChartData} layout="vertical" margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#555" }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#555" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: 13 }}
                    formatter={(v: number | undefined) => [`${v ?? 0} معاملة`, "عدد المعاملات"]}
                  />
                  <Bar dataKey="value" name="عدد المعاملات" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-[#F6F8FB] py-4">
              <span className="text-[#98A2B3]">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              <p className="text-sm text-[#667085]">لا توجد بيانات للمقارنة</p>
            </div>
          )}
        </div>
        <div className={`flex min-h-[200px] flex-col ${CARD} p-5`}>
          <h3 className="mb-3 text-sm font-semibold text-[#101828]">مقارنة المخولين (الفترة الحالية)</h3>
          {chartsLoading ? (
            <div className="flex min-h-[180px] flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f]/25 border-t-transparent" />
            </div>
          ) : delegatesChartData.length > 0 ? (
            <div className="min-h-[208px] w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={208} minHeight={208}>
                <BarChart data={delegatesChartData} layout="vertical" margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#555" }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#555" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: 13 }}
                    formatter={(v: number | undefined) => [`${v ?? 0} معاملة`, "عدد المعاملات"]}
                  />
                  <Bar dataKey="value" name="عدد المعاملات" fill="#667085" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-[#F6F8FB] py-4">
              <span className="text-[#98A2B3]">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <p className="text-sm text-[#667085]">لا توجد بيانات للمقارنة</p>
            </div>
          )}
        </div>
      </section>

      {/* تنبيهات إدارية + أفضل 3 مكاتب */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`flex flex-col ${CARD} p-5 ${CARD_HEIGHT_SECONDARY}`}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#101828]">
            <span className="text-amber-600/80">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </span>
            تنبيهات إدارية
          </h3>
          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {stats?.alerts?.slaExceeded?.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-2xl bg-[#F6F8FB] px-3 py-2">
                <span className="text-red-500">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <span className="flex-1 truncate text-sm text-[#101828]">{t.citizenName || "—"} — {t.officeName}</span>
              </div>
            ))}
            {stats?.alerts?.inactiveOffices?.slice(0, 3).map((o) => (
              <div key={o.id} className="flex items-center gap-2 rounded-2xl bg-[#F6F8FB] px-3 py-2">
                <span className="text-amber-600">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
                <span className="flex-1 truncate text-sm text-[#101828]">{o.name}</span>
              </div>
            ))}
            {stats?.alerts?.inactiveUsers?.slice(0, 3).map((u) => (
              <div key={u.id} className="flex items-center gap-2 rounded-2xl bg-[#F6F8FB] px-3 py-2">
                <span className="text-[#667085]">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <span className="flex-1 truncate text-sm text-[#101828]">{u.name}</span>
              </div>
            ))}
            {(!stats?.alerts?.slaExceeded?.length && !stats?.alerts?.inactiveOffices?.length && !stats?.alerts?.inactiveUsers?.length) && (
              <p className="py-1 text-sm text-[#667085]">لا توجد تنبيهات</p>
            )}
          </div>
        </div>

        <div className={`flex flex-col ${CARD} p-5 ${CARD_HEIGHT_SECONDARY}`}>
          <h3 className="mb-3 text-sm font-semibold text-[#101828]">أفضل 3 مكاتب هذا الشهر</h3>
          <div className="flex-1 space-y-1.5">
            {(stats?.top3OfficesThisMonth ?? []).length > 0 ? (
              (() => {
                const maxCount = Math.max(...stats!.top3OfficesThisMonth!.map((x) => x.count), 1);
                return stats!.top3OfficesThisMonth!.map((o, i) => (
                    <div key={o.name} className="rounded-2xl bg-[#F6F8FB] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base">{["🥇", "🥈", "🥉"][i]}</span>
                      <span className="flex-1 truncate text-[15px] font-medium text-[#101828]">{o.name}</span>
                      <span className="text-lg font-semibold text-[#101828]">{o.count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-[#1e3a5f]" style={{ width: `${(o.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                ));
              })()
            ) : (
              <p className="py-2 text-sm text-[#667085]">لا توجد بيانات</p>
            )}
          </div>
        </div>
      </section>

      {/* Charts + Activity */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <div className={`flex min-h-[170px] flex-col ${CARD} p-5`}>
            <h3 className="mb-3 text-sm font-semibold text-[#101828]">معاملات عبر الزمن (آخر 30 يوم)</h3>
            <p className="mb-2 text-xs text-[#667085]">
              إجمالي المعاملات من جميع المكاتب — تجميع من صفحات الاستقبال والفرز
              {officeId ? ` (مكتب محدد)` : " (كل المكاتب)"}
            </p>
            {timelineError ? (
              <div className="flex min-h-[150px] flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">{timelineError}</p>
                <p className="text-xs text-amber-700">تأكد من تسجيل الدخول كمدير أعلى وتحديث الصفحة</p>
              </div>
            ) : chartsLoading ? (
              <div className="flex min-h-[150px] flex-1 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f]/25 border-t-transparent" />
              </div>
            ) : timelineData.length > 0 ? (
              <div className="min-h-[192px] w-full" style={{ minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={192} minHeight={192}>
                  <AreaChart data={timelineData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT_NAVY} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={ACCENT_NAVY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={(v) => formatDate(v)} tick={{ fontSize: 12, fill: "#555" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#555" }} domain={(_min, max) => [0, Math.max(Number(max) ?? 0, 1)]} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontSize: 14 }}
                      labelFormatter={(v) => formatDate(v)}
                      formatter={(v: number | undefined) => [`${v ?? 0} معاملة`, "عدد المعاملات"]}
                    />
                    <Area type="monotone" dataKey="count" name="عدد المعاملات" stroke={ACCENT_NAVY} strokeWidth={2} fill="url(#areaGradient)" />
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

          <div className={`flex min-h-[170px] flex-col ${CARD} p-5`}>
            <h3 className="mb-3 text-sm font-semibold text-[#101828]">توزيع الحالات</h3>
            {chartsLoading ? (
              <div className="flex min-h-[150px] flex-1 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f]/25 border-t-transparent" />
              </div>
            ) : statusData.length > 0 && statusData.some((d) => d.value > 0) ? (
              <div className="flex min-h-[150px] flex-1 flex-row items-center gap-4" style={{ minHeight: 0 }}>
                <div className="h-36 min-h-[144px] min-w-[140px] flex-1 shrink-0" style={{ minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={144} minHeight={144}>
                    <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={36} outerRadius={52} paddingAngle={1} dataKey="value">
                        {statusData.map((_, i) => (
                          <Cell key={i} fill={statusData[i].fill} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 14 }} formatter={(v: number | undefined, n: string | undefined, p: { payload?: StatusPoint }) => [`${v ?? 0}`, p?.payload?.name ?? n ?? ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex flex-col gap-2 flex-1 min-w-0" aria-hidden>
                  {statusData.map((d, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span className="truncate text-[#101828]">{d.name}</span>
                      <span className="shrink-0 font-medium text-[#667085]">{d.value}</span>
                    </li>
                  ))}
                </ul>
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
        <div className={`flex min-h-[180px] flex-col ${CARD} p-5 xl:col-span-4`}>
          <h3 className="mb-3 text-sm font-semibold text-[#101828]">آخر النشاط</h3>
          {chartsLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f]/25 border-t-transparent" />
            </div>
          ) : activity.length > 0 ? (
            <div className="relative flex-1">
              <div className="absolute right-[9px] top-1 bottom-1 w-px bg-[#e8e8e8]" />
              <div className="space-y-0">
                {activity.map((a) => (
                  <div key={a.id} className="relative flex items-start gap-2.5 py-1.5">
                    <span
                      className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white bg-white ${
                        a.actionType === "إنجاز" ? "text-[#027A48]" : a.actionType === "تحذير" ? "text-[#B42318]" : "text-[#1e3a5f]"
                      }`}
                    >
                      {ACTION_ICONS[a.actionType] ?? ACTION_ICONS.إضافة}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#101828]">{a.actionType} — {a.citizenName || "—"}</p>
                      <p className="text-xs text-[#667085]">{a.executor} · {formatRelativeTime(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[100px] flex-col items-center justify-center gap-1 rounded-2xl bg-[#F6F8FB] py-3">
              <span className="text-[#98A2B3]">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <p className="text-sm text-[#667085]">لا توجد معاملات حديثة</p>
            </div>
          )}
        </div>
      </section>

      {/* إجراءات سريعة */}
      <section className={`${CARD} p-5`}>
        <h2 className="mb-4 text-sm font-semibold text-[#101828]">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/super-admin/users", label: "إنشاء مستخدم", desc: "إضافة مستخدم جديد للنظام", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3z" },
            { href: "/super-admin/offices", label: "إضافة مكتب", desc: "تسجيل مكتب أو جهة جديدة", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
            { href: "/super-admin/reports", label: "التقارير", desc: "عرض وتصدير التقارير", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
            { href: "/super-admin/reports", label: "المتأخرات", desc: "معاملات تحتاج متابعة", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex min-h-[7.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#F6F8FB] p-3 transition hover:bg-white hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] sm:p-4"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#1e3a5f]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon} />
                </svg>
              </span>
              <span className="text-center text-sm font-semibold text-[#101828]">{a.label}</span>
              <span className="text-center text-xs leading-tight text-[#667085]">{a.desc}</span>
            </Link>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}
