"use client";

import { useState, useCallback, useEffect } from "react";
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
} from "recharts";

const PIE_COLORS = ["#7C3AED", "#1E6B3A", "#B08D57", "#b91c1c", "#5B7C99", "#6b7280", "#0ea5e9"];

const SOURCE_SECTION_LABELS: Record<string, string> = {
  RECEPTION: "الاستعلامات والاستقبال",
  COORDINATOR: "المتابعة",
  DOCUMENTATION: "التوثيق",
  ADMIN: "مدير المكتب",
  SORTING: "الفرز",
};

type Transaction = {
  id: string;
  citizenName: string | null;
  citizenPhone: string | null;
  transactionType: string | null;
  type: string | null;
  serialNumber: string | null;
  createdAt: string;
  updatedAt?: string;
  status?: string;
  urgent?: boolean;
  cannotComplete?: boolean;
  delegateName?: string | null;
  formationName?: string | null;
  officeName?: string | null;
  sourceSection?: string | null;
};

type DailyReport = {
  receivedToday: number;
  receivedPendingToday: number;
  actionTakenToday: number;
  urgentToday: number;
  cannotCompleteToday: number;
  delegatedToday: number;
  todayLabel: string;
};

type Stats = {
  total: number;
  received: number;
  outgoing: number;
  urgent: number;
  cannotComplete: number;
  delegated: number;
};

type AlertGroup = {
  sourceName: string;
  transactionType: string;
  count: number;
  latestReceiptDate: string;
  transactionIds: string[];
};

type DelegateChartPoint = { name: string; value: number };
type ChartPoint = { name: string; value: number };
type WeekChartPoint = { date: string; label: string; count: number };

const POLL_INTERVAL_MS = 6000;

function getWeekDayLabel(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("ar-IQ", { weekday: "short", numberingSystem: "arab" }).format(new Date(dateStr));
  } catch {
    return dateStr.slice(5) || "";
  }
}

function isToday(dateStr: string, refDate?: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const today = refDate ?? new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function getTodayLabel(): string {
  return new Intl.DateTimeFormat("ar-IQ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    numberingSystem: "arab",
  }).format(new Date());
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      dateStyle: "short",
      numberingSystem: "arab",
    }).format(new Date(s));
  } catch {
    return s;
  }
}

export default function SortingDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    received: 0,
    outgoing: 0,
    urgent: 0,
    cannotComplete: 0,
    delegated: 0,
  });
  const [alertGroups, setAlertGroups] = useState<AlertGroup[]>([]);
  const [delegatesChartData, setDelegatesChartData] = useState<DelegateChartPoint[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<ChartPoint[]>([]);
  const [formationBreakdown, setFormationBreakdown] = useState<ChartPoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeekChartPoint[]>([]);
  const [distributionPie, setDistributionPie] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport>({
    receivedToday: 0,
    receivedPendingToday: 0,
    actionTakenToday: 0,
    urgentToday: 0,
    cannotCompleteToday: 0,
    delegatedToday: 0,
    todayLabel: "",
  });

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions?limit=200", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const all: Transaction[] = data.transactions || [];
        const received = all.filter((t) => !t.urgent && !t.cannotComplete);
        const outgoing = all.filter((t) => t.urgent || t.cannotComplete);
        const urgent = all.filter((t) => t.urgent).length;
        const cannotComplete = all.filter((t) => t.cannotComplete).length;
        const delegated = all.filter((t) => t.delegateName).length;
        setStats({
          total: all.length,
          received: received.length,
          outgoing: outgoing.length,
          urgent,
          cannotComplete,
          delegated,
        });
        const now = new Date();
        const receivedToday = all.filter((t) => isToday(t.createdAt, now)).length;
        const receivedPendingToday = received.filter((t) => isToday(t.createdAt, now)).length;
        const withAction = all.filter((t) => t.urgent || t.cannotComplete || t.delegateName);
        const actionTakenToday = withAction.filter((t) => t.updatedAt && isToday(t.updatedAt, now)).length;
        const urgentToday = all.filter((t) => t.urgent && t.updatedAt && isToday(t.updatedAt, now)).length;
        const cannotCompleteToday = all.filter((t) => t.cannotComplete && t.updatedAt && isToday(t.updatedAt, now)).length;
        const delegatedToday = all.filter((t) => t.delegateName && t.updatedAt && isToday(t.updatedAt, now)).length;
        setDailyReport({
          receivedToday,
          receivedPendingToday,
          actionTakenToday,
          urgentToday,
          cannotCompleteToday,
          delegatedToday,
          todayLabel: getTodayLabel(),
        });
        const delegatedList = all.filter((t) => t.delegateName);
        const delegateCounts = new Map<string, number>();
        for (const t of delegatedList) {
          const name = t.delegateName || "—";
          delegateCounts.set(name, (delegateCounts.get(name) || 0) + 1);
        }
        const chartData = Array.from(delegateCounts.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
        setDelegatesChartData(chartData);

        const typeCounts = new Map<string, number>();
        const formationCounts = new Map<string, number>();
        for (const t of all) {
          const type = t.transactionType || t.type || "غير محدد";
          typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
          const formation = t.formationName || t.officeName || "وحدة الاستقبال";
          formationCounts.set(formation, (formationCounts.get(formation) || 0) + 1);
        }
        setTypeBreakdown(
          Array.from(typeCounts.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
        );
        setFormationBreakdown(
          Array.from(formationCounts.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
        );

        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 6);
        const dayCounts = new Map<string, number>();
        for (let d = 0; d < 7; d++) {
          const day = new Date(weekAgo);
          day.setDate(day.getDate() + d);
          const key = day.toISOString().slice(0, 10);
          dayCounts.set(key, 0);
        }
        for (const t of all) {
          const d = t.createdAt?.slice(0, 10) ?? "";
          if (d && dayCounts.has(d)) dayCounts.set(d, (dayCounts.get(d) || 0) + 1);
        }
        setWeeklyData(
          Array.from(dayCounts.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, label: getWeekDayLabel(date), count }))
        );

        const urgentCount = all.filter((t) => t.urgent).length;
        const cannotCompleteCount = all.filter((t) => t.cannotComplete).length;
        const delegatedCount = all.filter((t) => t.delegateName).length;
        const doneCount = all.filter((t) => t.status === "DONE").length;
        const atSortingCount = all.filter((t) => !t.urgent && !t.cannotComplete && !t.delegateName && t.status !== "DONE").length;
        setDistributionPie(
          [
            { name: "قيد الفرز (بانتظار إجراء)", value: atSortingCount, fill: "#7C3AED" },
            { name: "محوّلة للمخولين", value: delegatedCount, fill: "#1E6B3A" },
            { name: "عاجلة", value: urgentCount, fill: "#f59e0b" },
            { name: "تعذر إنجازها", value: cannotCompleteCount, fill: "#6b7280" },
            { name: "منجزة", value: doneCount, fill: "#0d9488" },
          ].filter((x) => x.value > 0)
        );

        const pending = all.filter(
          (t) => !t.urgent && !t.cannotComplete && !t.delegateName && t.status !== "DONE"
        );
        const grouped = new Map<string, AlertGroup>();
        for (const t of pending) {
          const sourceName =
            (t.sourceSection && SOURCE_SECTION_LABELS[t.sourceSection]) ||
            t.sourceSection ||
            "غير محدد";
          const txType = t.transactionType || t.type || "—";
          const key = `${sourceName}|${txType}`;
          const existing = grouped.get(key);
          if (existing) {
            existing.count++;
            if (t.createdAt > existing.latestReceiptDate) {
              existing.latestReceiptDate = t.createdAt;
            }
            existing.transactionIds.push(t.id);
          } else {
            grouped.set(key, {
              sourceName,
              transactionType: txType,
              count: 1,
              latestReceiptDate: t.createdAt,
              transactionIds: [t.id],
            });
          }
        }
        setAlertGroups(Array.from(grouped.values()).sort((a, b) => b.count - a.count));
      } else {
        setAlertGroups([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const id = setInterval(loadData, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadData]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B1B1B]">مرحباً، قسم الفرز</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">لوحة تحكم قسم الفرز وإحالة المعاملات</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!loading && stats.received > 0 && (
            <Link
              href="/sorting/received"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border-2 border-red-500 bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700 shadow-sm animate-pulse hover:bg-red-100"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
              </span>
              <span>{stats.received} معاملة جديدة مستلمة</span>
            </Link>
          )}
          <Link
            href="/sorting/received"
            className="flex items-center gap-2 rounded-xl border border-[#7C3AED] bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#6d28d9]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            المعاملات المستلمة
          </Link>
          <Link
            href="/sorting/outgoing"
            className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] shadow-sm transition-colors hover:bg-[#f6f3ed]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            المعاملات الصادرة
          </Link>
          <Link
            href="/sorting/reports"
            className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] shadow-sm transition-colors hover:bg-[#f6f3ed]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            تقارير وإحصائيات
          </Link>
        </div>
      </div>

      {/* بطاقات إحصائية */}
      {!loading && (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
            <h2 className="text-base font-semibold text-[#1B1B1B]">ملخص إحصائي</h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">أهم المؤشرات الإحصائية لقسم الفرز</p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-6">
          <Link
            href="/sorting/transactions"
            className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#5B7C99] bg-white p-4 shadow-sm transition-colors hover:border-[#7C3AED]/50 hover:shadow-md"
          >
            <p className="text-sm font-medium text-[#5a5a5a]">جميع المعاملات</p>
            <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{stats.total}</p>
          </Link>
          <Link
            href="/sorting/received"
            className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#7C3AED] bg-white p-4 shadow-sm transition-colors hover:border-[#7C3AED]/50 hover:shadow-md"
          >
            <p className="text-sm font-medium text-[#5a5a5a]">المعاملات المستلمة</p>
            <p className="mt-2 text-2xl font-bold text-[#7C3AED]">{stats.received}</p>
          </Link>
          <Link
            href="/sorting/outgoing"
            className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#5B7C99] bg-white p-4 shadow-sm transition-colors hover:border-[#7C3AED]/50 hover:shadow-md"
          >
            <p className="text-sm font-medium text-[#5a5a5a]">المعاملات الصادرة</p>
            <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{stats.outgoing}</p>
          </Link>
          <div className="flex flex-col rounded-xl border border-amber-200 border-r-4 border-r-amber-500 bg-amber-50/50 p-4 shadow-sm">
            <p className="text-sm font-medium text-amber-700">عاجل</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{stats.urgent}</p>
          </div>
          <div className="flex flex-col rounded-xl border border-slate-200 border-r-4 border-r-slate-500 bg-slate-50/50 p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-700">تعذر الإنجاز</p>
            <p className="mt-2 text-2xl font-bold text-slate-700">{stats.cannotComplete}</p>
          </div>
          <div className="flex flex-col rounded-xl border border-[#1E6B3A]/30 border-r-4 border-r-[#1E6B3A] bg-[#ccfbf1]/30 p-4 shadow-sm">
            <p className="text-sm font-medium text-[#0f766e]">المحولة للمخولين</p>
            <p className="mt-2 text-2xl font-bold text-[#0f766e]">{stats.delegated}</p>
          </div>
          </div>
        </article>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent" />
        </div>
      ) : alertGroups.length > 0 ? (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-amber-50/50 px-6 py-3">
            <h2 className="text-base font-semibold text-[#1B1B1B]">تنبيهات المعاملات المستلمة</h2>
          </div>
          <div className="space-y-4 p-6">
          {alertGroups.map((g, i) => (
            <Link
              key={i}
              href="/sorting/received"
              className="block rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-medium text-amber-900">
                      لديك <strong>{g.count}</strong> معاملة واردة من قسم <strong>{g.sourceName}</strong>
                    </p>
                    <p className="mt-0.5 text-sm text-amber-800">
                      نوع المعاملة: <strong>{g.transactionType}</strong> — تاريخ الاستلام: {formatDate(g.latestReceiptDate)}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-amber-200 px-3 py-1.5 text-sm font-bold text-amber-900">
                  {g.count}
                </span>
              </div>
            </Link>
          ))}
          </div>
        </article>
      ) : (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="p-8">
            <p className="text-center text-[#5a5a5a]">لا توجد معاملات مستلمة تحتاج إلى إجراء حالياً.</p>
          </div>
        </article>
      )}

      {/* تقرير اليوم */}
      {!loading && (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#1B1B1B]">
              <svg className="h-5 w-5 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              تقرير اليوم
            </h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]" suppressHydrationWarning>
              {dailyReport.todayLabel} — من بداية اليوم حتى الآن
            </p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-6">
            <Link
              href="/sorting/received"
              className="rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 p-4 transition-colors hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/10"
            >
              <p className="text-sm font-medium text-[#5a5a5a]">استلمت اليوم</p>
              <p className="mt-1 text-2xl font-bold text-[#7C3AED]">{dailyReport.receivedToday}</p>
              <p className="mt-1 text-xs text-[#5a5a5a]">معاملة جديدة وردت للنظام</p>
            </Link>
            <Link
              href="/sorting/received"
              className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-4 transition-colors hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/10"
            >
              <p className="text-sm font-medium text-[#5a5a5a]">من المستلمة ورد اليوم</p>
              <p className="mt-1 text-2xl font-bold text-[#7C3AED]">{dailyReport.receivedPendingToday}</p>
              <p className="mt-1 text-xs text-[#5a5a5a]">ما زالت في قائمة المستلمة</p>
            </Link>
            <div className="rounded-xl border border-[#0D9488]/30 bg-[#0D9488]/5 p-4">
              <p className="text-sm font-medium text-[#5a5a5a]">اتخذت إجراء اليوم</p>
              <p className="mt-1 text-2xl font-bold text-[#0D9488]">{dailyReport.actionTakenToday}</p>
              <p className="mt-1 text-xs text-[#5a5a5a]">عاجل / لا يمكن الانجاز / محوّلة</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-sm font-medium text-amber-700">عاجل اليوم</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{dailyReport.urgentToday}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-sm font-medium text-slate-700">لا يمكن الانجاز اليوم</p>
              <p className="mt-1 text-2xl font-bold text-slate-700">{dailyReport.cannotCompleteToday}</p>
            </div>
            <div className="rounded-xl border border-[#1E6B3A]/30 bg-[#ccfbf1]/30 p-4">
              <p className="text-sm font-medium text-[#0f766e]">محوّلة للمخولين اليوم</p>
              <p className="mt-1 text-2xl font-bold text-[#0f766e]">{dailyReport.delegatedToday}</p>
            </div>
          </div>
        </article>
      )}

      {/* رسوم بيانية: توزيع المعاملات + النوع + الجهة */}
      {!loading && (
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">توزيع المعاملات</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">حسب مسار العمل والحالة</p>
            </div>
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
              {distributionPie.length > 0 ? (
                <>
                  <div className="shrink-0">
                    <PieChart width={160} height={160}>
                      <Pie data={distributionPie} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                        {distributionPie.map((_, i) => (
                          <Cell key={i} fill={distributionPie[i].fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [Number(v ?? 0), "معاملة"]} contentStyle={{ borderRadius: "8px", border: "1px solid #d4cfc8" }} />
                    </PieChart>
                  </div>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {distributionPie.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="text-[#1B1B1B]">{item.name}</span>
                        <span className="font-medium text-[#7C3AED]">({item.value})</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="py-8 text-[#5a5a5a]">لا توجد معاملات</p>
              )}
            </div>
          </article>
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">حسب نوع المعاملة</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">أكثر ٨ أنواع معاملة</p>
            </div>
            <div className="max-h-64 overflow-y-auto px-6 py-4">
              {typeBreakdown.length > 0 ? (
                <ul className="space-y-3">
                  {typeBreakdown.map((item, i) => {
                    const maxVal = Math.max(...typeBreakdown.map((x) => x.value), 1);
                    const pct = (item.value / maxVal) * 100;
                    return (
                      <li key={i} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate font-medium text-[#1B1B1B]" title={item.name}>
                            {item.name}
                          </span>
                          <span className="shrink-0 font-bold text-[#7C3AED]">{item.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#f6f3ed]">
                          <div
                            className="h-full rounded-full bg-[#7C3AED] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex h-32 items-center justify-center text-[#5a5a5a]">لا توجد بيانات</div>
              )}
            </div>
          </article>
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">حسب الجهة المصدرية</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">التشكيلات ومصادر المعاملات</p>
            </div>
            <div className="max-h-64 overflow-y-auto px-6 py-4">
              {formationBreakdown.length > 0 ? (
                <ul className="space-y-3">
                  {formationBreakdown.map((item, i) => {
                    const maxVal = Math.max(...formationBreakdown.map((x) => x.value), 1);
                    const pct = (item.value / maxVal) * 100;
                    return (
                      <li key={i} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate font-medium text-[#1B1B1B]" title={item.name}>
                            {item.name}
                          </span>
                          <span className="shrink-0 font-bold text-[#5B7C99]">{item.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#f6f3ed]">
                          <div
                            className="h-full rounded-full bg-[#5B7C99] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex h-32 items-center justify-center text-[#5a5a5a]">لا توجد بيانات</div>
              )}
            </div>
          </article>
        </div>
      )}

      {/* رسم بياني: المعاملات خلال الأسبوع */}
      {!loading && (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
            <h2 className="text-base font-semibold text-[#1B1B1B]">المعاملات الواردة خلال الأسبوع</h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">عدد المعاملات المسجلة لكل يوم في آخر ٧ أيام</p>
          </div>
          <div className="h-64 min-h-[200px] px-6 py-4">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={256} minHeight={200}>
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#555" }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [Number(v ?? 0), "معاملة"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #d4cfc8" }}
                  />
                  <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[#5a5a5a]">لا توجد بيانات</div>
            )}
          </div>
        </article>
      )}

      {/* رسم بياني للمخولين */}
      {!loading && (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#1B1B1B]">
              <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              المعاملات المحوّلة للمخولين
            </h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">توزيع المعاملات حسب المخول</p>
          </div>
          <div className="px-6 py-4">
          {delegatesChartData.length > 0 ? (
            <div className="h-64 min-h-[200px] w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={256} minHeight={200}>
                <BarChart
                  data={delegatesChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 8, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#555" }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#555" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e5e5e5",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      fontSize: 13,
                    }}
                    formatter={(v: number | undefined) => [`${v ?? 0} معاملة`, "عدد المعاملات"]}
                  />
                  <Bar dataKey="value" name="عدد المعاملات" fill="#1E6B3A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#d4cfc8] bg-[#FAFAF9] py-8">
              <span className="text-[#1E6B3A]/40">
                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              <p className="text-sm text-[#5a5a5a]">لا توجد معاملات محوّلة للمخولين بعد</p>
            </div>
          )}
          </div>
        </article>
      )}
    </div>
  );
}
