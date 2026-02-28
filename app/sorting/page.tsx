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
} from "recharts";

type Transaction = {
  id: string;
  citizenName: string | null;
  citizenPhone: string | null;
  transactionType: string | null;
  type: string | null;
  serialNumber: string | null;
  createdAt: string;
  updatedAt?: string;
  urgent?: boolean;
  cannotComplete?: boolean;
  delegateName?: string | null;
  formationName?: string | null;
  officeName?: string | null;
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

const POLL_INTERVAL_MS = 6000;

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
        const pending = received;
        const grouped = new Map<string, AlertGroup>();
        for (const t of pending) {
          const sourceName = t.formationName || t.officeName || "وحدة الاستقبال";
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
      <div>
        <h2 className="text-lg font-semibold text-[#1B1B1B]">مرحباً، قسم الفرز</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">لوحة تحكم قسم الفرز</p>
      </div>

      {/* بطاقات إحصائية */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Link
            href="/sorting/transactions"
            className="rounded-xl border border-[#d4cfc8] bg-white p-4 shadow-sm transition-colors hover:border-[#7C3AED]/50 hover:shadow-md"
          >
            <p className="text-sm font-medium text-[#5a5a5a]">جميع المعاملات</p>
            <p className="mt-1 text-2xl font-bold text-[#1B1B1B]">{stats.total}</p>
          </Link>
          <Link
            href="/sorting/received"
            className="rounded-xl border border-[#d4cfc8] bg-white p-4 shadow-sm transition-colors hover:border-[#7C3AED]/50 hover:shadow-md"
          >
            <p className="text-sm font-medium text-[#5a5a5a]">المعاملات المستلمة</p>
            <p className="mt-1 text-2xl font-bold text-[#7C3AED]">{stats.received}</p>
          </Link>
          <Link
            href="/sorting/outgoing"
            className="rounded-xl border border-[#d4cfc8] bg-white p-4 shadow-sm transition-colors hover:border-[#7C3AED]/50 hover:shadow-md"
          >
            <p className="text-sm font-medium text-[#5a5a5a]">المعاملات الصادرة</p>
            <p className="mt-1 text-2xl font-bold text-[#7C3AED]">{stats.outgoing}</p>
          </Link>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <p className="text-sm font-medium text-amber-700">عاجل</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{stats.urgent}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-700">لا يمكن الانجاز</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{stats.cannotComplete}</p>
          </div>
          <div className="rounded-xl border border-[#1E6B3A]/30 bg-[#ccfbf1]/30 p-4 shadow-sm">
            <p className="text-sm font-medium text-[#0f766e]">المحولة للمخولين</p>
            <p className="mt-1 text-2xl font-bold text-[#0f766e]">{stats.delegated}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent" />
        </div>
      ) : alertGroups.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-base font-medium text-[#1B1B1B]">تنبيهات المعاملات المستلمة</h3>
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
                      لديك <strong>{g.count}</strong> معاملة من قسم <strong>{g.sourceName}</strong>
                    </p>
                    <p className="mt-0.5 text-sm text-amber-800">
                      نوع المعاملة: <strong>{g.transactionType}</strong> — تاريخ استلام أحدث معاملة: {formatDate(g.latestReceiptDate)}
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
      ) : (
        <div className="rounded-2xl border border-[#d4cfc8] bg-white p-8 shadow-sm">
          <p className="text-center text-[#5a5a5a]">لا توجد معاملات مستلمة تحتاج إلى إجراء حالياً.</p>
        </div>
      )}

      {/* تقرير اليوم */}
      {!loading && (
        <section className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-[#1B1B1B]">
            <svg className="h-5 w-5 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تقرير اليوم
          </h3>
          <p className="mb-4 text-sm text-[#5a5a5a]" suppressHydrationWarning>
            {dailyReport.todayLabel} — من بداية اليوم حتى الآن
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
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
        </section>
      )}

      {/* رسم بياني للمخولين */}
      {!loading && (
        <section className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#1B1B1B]">
            <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            المعاملات المحوّلة للمخولين
          </h3>
          {delegatesChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
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
        </section>
      )}
    </div>
  );
}
