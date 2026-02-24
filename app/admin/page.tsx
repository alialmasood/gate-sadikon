"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
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
  Legend,
} from "recharts";

type Stats = {
  officeName: string;
  transactionsToday: number;
  totalTransactions: number;
  doneTransactions: number;
  overdueCount: number;
  completionRate: number;
};

type TimelinePoint = { date: string; count: number };
type StatusPoint = { name: string; value: number; fill: string };
type ActivityItem = {
  id: string;
  citizenName: string | null;
  status: string;
  actionType: string;
  executor: string;
  createdAt: string;
  completedAt: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
};

function formatDate(d: string) {
  return new Intl.DateTimeFormat("ar-IQ", { month: "short", day: "numeric", numberingSystem: "arab" }).format(new Date(d));
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [statusData, setStatusData] = useState<StatusPoint[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, timelineRes, statusRes, activityRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/charts?chart=timeline&period=months:30"),
        fetch("/api/admin/charts?chart=status"),
        fetch("/api/admin/charts?chart=activity"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (timelineRes.ok) setTimelineData(await timelineRes.json());
      if (statusRes.ok) setStatusData(await statusRes.json());
      if (activityRes.ok) setActivity(await activityRes.json());
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statCards = stats
    ? [
        { label: "معاملات اليوم", value: stats.transactionsToday, icon: "📋", color: "bg-[#1E6B3A]/10 text-[#1E6B3A]" },
        { label: "إجمالي المعاملات", value: stats.totalTransactions, icon: "📊", color: "bg-[#B08D57]/10 text-[#B08D57]" },
        { label: "المنجزة", value: stats.doneTransactions, icon: "✅", color: "bg-emerald-100 text-emerald-700" },
        { label: "المتأخرة", value: stats.overdueCount, icon: "⚠️", color: "bg-amber-100 text-amber-700" },
      ]
    : [];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1B1B1B]">
            مرحباً، {stats?.officeName ?? "مدير المكتب"}
          </h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">نظرة عامة على نشاط مكتبك</p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] transition hover:bg-[#f6f3ed] disabled:opacity-60"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          تحديث
        </button>
      </div>

      {/* نسبة الإنجاز */}
      <section className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#5a5a5a]">نسبة الإنجاز</p>
            <p className="mt-1 text-3xl font-bold text-[#1E6B3A]">{(stats?.completionRate ?? 0)}%</p>
          </div>
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" stroke="#e5e5e5" strokeWidth="3" fill="none" />
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="#1E6B3A"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 14}
                strokeDashoffset={2 * Math.PI * 14 * (1 - (stats?.completionRate ?? 0) / 100)}
              />
            </svg>
          </div>
        </div>
      </section>

      {/* بطاقات الإحصائيات */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading && !stats
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-[#d4cfc8] bg-[#f6f3ed]" />
            ))
          : statCards.map((card) => (
              <div
                key={card.label}
                className="flex items-center gap-4 rounded-2xl border border-[#d4cfc8] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${card.color}`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#5a5a5a]">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-[#1B1B1B]">{card.value}</p>
                </div>
              </div>
            ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* رسم المعاملات */}
        <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-[#1B1B1B]">المعاملات خلال 30 يوم</h3>
          <div className="mt-4 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[#5a5a5a]">جاري التحميل…</div>
            ) : timelineData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[#5a5a5a]">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1E6B3A" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1E6B3A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number | undefined) => [v ?? 0, "معاملة"]}
                    labelFormatter={(l) => formatDate(l)}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #d4cfc8" }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#1E6B3A" strokeWidth={2} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        {/* توزيع الحالة */}
        <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-[#1B1B1B]">توزيع المعاملات حسب الحالة</h3>
          <div className="mt-4 flex h-64 items-center justify-center">
            {loading ? (
              <p className="text-[#5a5a5a]">جاري التحميل…</p>
            ) : statusData.length === 0 || statusData.every((s) => s.value === 0) ? (
              <p className="text-[#5a5a5a]">لا توجد معاملات</p>
            ) : (
              <PieChart width={280} height={240}>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={statusData[i].fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number | undefined, n: string | undefined, p: { payload?: { name?: string } }) => [v ?? 0, p?.payload?.name ?? n ?? ""]} />
                <Legend />
              </PieChart>
            )}
          </div>
        </article>
      </div>

      {/* آخر النشاط */}
      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#1B1B1B]">آخر المعاملات</h3>
          <Link
            href="/admin/transactions"
            className="text-sm font-medium text-[#1E6B3A] hover:underline"
          >
            عرض الكل
          </Link>
        </div>
        {loading ? (
          <p className="mt-4 py-8 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : activity.length === 0 ? (
          <p className="mt-4 py-8 text-center text-[#5a5a5a]">لا توجد معاملات حديثة</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[400px] text-right">
              <thead>
                <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                  <th className="py-3 pr-2">المواطن</th>
                  <th className="py-3 pr-2">الحالة</th>
                  <th className="py-3 pr-2">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {activity.slice(0, 8).map((a) => (
                  <tr key={a.id} className="border-b border-[#d4cfc8]/80 last:border-0">
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{a.citizenName || "—"}</td>
                    <td className="py-3 pr-2">
                      <span
                        className={
                          a.status === "DONE"
                            ? "text-[#1E6B3A] font-medium"
                            : a.status === "OVERDUE"
                              ? "text-amber-600 font-medium"
                              : "text-[#B08D57] font-medium"
                        }
                      >
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-sm text-[#5a5a5a]">
                      {new Date(a.createdAt).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}
