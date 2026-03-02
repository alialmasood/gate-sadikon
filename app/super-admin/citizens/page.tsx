"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  AreaChart,
  Area,
} from "recharts";

const BORDER_RADIUS = "rounded-xl";
const CARD_BG = "bg-white";
const BORDER_COLOR = "border-[#c9d6e3]";
const OFFICIAL_BG = "bg-[#f0f4f8]";
type OfficeStat = {
  id: string;
  name: string;
  type: string | null;
  status: string;
  total: number;
  pending: number;
  done: number;
  overdue: number;
};

type Analytics = {
  officeCount: number;
  totalTransactions: number;
  pendingCount: number;
  doneCount: number;
  overdueCount: number;
  offices: OfficeStat[];
  officesChartData: { name: string; count: number }[];
  statusData: { name: string; value: number; fill: string }[];
  timelineData: { date: string; count: number }[];
};

type Transaction = {
  id: string;
  citizenName: string | null;
  status: string;
  office: { id: string; name: string };
  createdAt: string;
  completedAt: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
};

const PERIOD_OPTIONS = [
  { value: "week", label: "أسبوع" },
  { value: "months:30", label: "شهر" },
];

function formatDate(s: string): string {
  try {
    return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "short", numberingSystem: "arab" }).format(new Date(s));
  } catch {
    return s;
  }
}

export default function OfficeAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("months:30");
  const [expandedOfficeId, setExpandedOfficeId] = useState<string | null>(null);
  const [officeTransactions, setOfficeTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/offices/analytics?period=${period}`);
      if (res.ok) setAnalytics(await res.json());
    } finally {
      setLoading(false);
    }
  }, [period]);

  const loadOfficeTransactions = useCallback(async (officeId: string) => {
    setTransactionsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/transactions?officeId=${officeId}&limit=100`);
      if (res.ok) {
        const { transactions } = await res.json();
        setOfficeTransactions(transactions ?? []);
      }
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (expandedOfficeId) loadOfficeTransactions(expandedOfficeId);
    else setOfficeTransactions([]);
  }, [expandedOfficeId, loadOfficeTransactions]);

  const filteredOffices = analytics?.offices.filter(
    (o) =>
      !searchQuery.trim() ||
      o.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (o.type ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase())
  ) ?? [];

  return (
    <div className={`min-h-screen ${OFFICIAL_BG} pb-8`} dir="rtl">
      {/* ترويسة رسمية */}
      <div className={`mb-6 ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} px-5 py-5 shadow-sm sm:mb-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">
              تحليلات المكاتب ونشاط المعاملات
            </h1>
            <p className="mt-1 text-sm text-[#5a6c7d]">
              عدد المكاتب، إحصائيات المعاملات لكل مكتب، ومقارنات بيانية لنشاط العمل
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
            <svg className="h-6 w-6 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* الفلترة */}
        <section className={`flex flex-wrap items-center gap-3 ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} px-4 py-3 shadow-sm`}>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`${BORDER_RADIUS} px-4 py-2 text-base font-medium transition ${
                  period === p.value ? "bg-[#1e3a5f] text-white" : "border border-[#c9d6e3] bg-white text-[#1e3a5f] hover:bg-[#f0f4f8]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => loadAnalytics()}
            className="flex items-center gap-2 rounded-xl border border-[#c9d6e3] bg-white px-4 py-2 text-base font-medium text-[#1e3a5f] transition hover:bg-[#f0f4f8]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث
          </button>
        </section>

        {/* بطاقات الإجماليات */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} p-5 shadow-sm min-h-[110px]`}>
                <div className="h-4 w-24 animate-pulse rounded bg-[#e8dfcf]" />
                <div className="mt-2 h-8 w-16 animate-pulse rounded bg-[#e8dfcf]" />
              </div>
            ))
          ) : (
            <>
              <div className={`flex flex-col ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} p-5 shadow-sm min-h-[110px]`}>
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-[#5a5a5a]">عدد المكاتب</span>
                  <span className="text-[#1e3a5f]/80">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                </div>
                <p className="mt-2 text-[34px] font-bold leading-tight text-[#1B1B1B]">{analytics?.officeCount ?? 0}</p>
                <Link href="/super-admin/offices" className="mt-1 text-sm text-[#1e3a5f] hover:underline">
                  إدارة المكاتب →
                </Link>
              </div>
              <div className={`flex flex-col ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} p-5 shadow-sm min-h-[110px]`}>
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-[#5a5a5a]">إجمالي المعاملات</span>
                  <span className="text-[#1e3a5f]/80">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </span>
                </div>
                <p className="mt-2 text-[34px] font-bold leading-tight text-[#1B1B1B]">{analytics?.totalTransactions ?? 0}</p>
              </div>
              <div className={`flex flex-col ${BORDER_RADIUS} border border-amber-200 bg-amber-50/60 p-5 shadow-sm min-h-[110px]`}>
                <span className="text-base font-medium text-amber-700">قيد التنفيذ</span>
                <p className="mt-2 text-[34px] font-bold leading-tight text-amber-700">{analytics?.pendingCount ?? 0}</p>
              </div>
              <div className={`flex flex-col ${BORDER_RADIUS} border border-[#1E6B3A]/30 bg-[#1E6B3A]/5 p-5 shadow-sm min-h-[110px]`}>
                <span className="text-base font-medium text-[#1E6B3A]">منجزة</span>
                <p className="mt-2 text-[34px] font-bold leading-tight text-[#1E6B3A]">{analytics?.doneCount ?? 0}</p>
              </div>
              <div className={`flex flex-col ${BORDER_RADIUS} border border-red-200 bg-red-50/60 p-5 shadow-sm min-h-[110px]`}>
                <span className="text-base font-medium text-red-700">متأخرة</span>
                <p className="mt-2 text-[34px] font-bold leading-tight text-red-700">{analytics?.overdueCount ?? 0}</p>
              </div>
            </>
          )}
        </section>

        {/* مخططات بيانية */}
        <section className="grid gap-4 lg:grid-cols-2">
          {/* مقارنة المكاتب */}
          <div className={`flex min-h-[280px] flex-col ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} p-4 shadow-sm`}>
            <h3 className="mb-2.5 text-base font-semibold text-[#1e3a5f]">مقارنة المكاتب (عدد المعاملات)</h3>
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f]/50 border-t-transparent" />
              </div>
            ) : analytics?.officesChartData && analytics.officesChartData.length > 0 ? (
              <div className="min-h-[208px] w-full" style={{ minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={208} minHeight={208}>
                  <BarChart data={analytics.officesChartData} layout="vertical" margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "#555" }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 14 }} />
                    <Bar dataKey="count" name="عدد المعاملات" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#c9d6e3] bg-[#f8fafc] py-8">
                <p className="text-sm text-[#5a5a5a]">لا توجد معاملات لعرضها</p>
              </div>
            )}
          </div>

          {/* توزيع الحالات */}
          <div className={`flex min-h-[280px] flex-col ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} p-4 shadow-sm`}>
            <h3 className="mb-2.5 text-base font-semibold text-[#1e3a5f]">توزيع الحالات الإجمالي</h3>
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f]/50 border-t-transparent" />
              </div>
            ) : analytics?.statusData && analytics.statusData.some((d) => d.value > 0) ? (
              <div className="flex min-h-[200px] flex-1 flex-row items-center gap-4" style={{ minHeight: 0 }}>
                <div className="h-36 min-h-[144px] min-w-[140px] flex-1 shrink-0" style={{ minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={144} minHeight={144}>
                    <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <Pie data={analytics.statusData} cx="50%" cy="50%" innerRadius={36} outerRadius={52} paddingAngle={1} dataKey="value">
                        {analytics.statusData.map((_, i) => (
                          <Cell key={i} fill={analytics.statusData[i].fill} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [v ?? 0, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex flex-col gap-2 flex-1 min-w-0">
                  {analytics.statusData.map((d, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span className="truncate text-[#1B1B1B]">{d.name}</span>
                      <span className="shrink-0 font-medium text-[#5a5a5a]">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#c9d6e3] bg-[#f8fafc] py-8">
                <p className="text-sm text-[#5a5a5a]">لا توجد معاملات</p>
              </div>
            )}
          </div>
        </section>

        {/* اتجاه النشاط */}
        <section className={`flex min-h-[220px] flex-col ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} p-4 shadow-sm`}>
          <h3 className="mb-2.5 text-base font-semibold text-[#1e3a5f]">اتجاه النشاط (آخر 14 يوم)</h3>
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f]/50 border-t-transparent" />
            </div>
          ) : analytics?.timelineData && analytics.timelineData.length > 0 ? (
            <div className="min-h-[176px] w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={176} minHeight={176}>
                <AreaChart data={analytics.timelineData}>
                  <defs>
                    <linearGradient id="officeAnalyticsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1e3a5f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5" }} labelFormatter={(v) => formatDate(v)} />
                  <Area type="monotone" dataKey="count" name="عدد المعاملات" stroke="#1e3a5f" strokeWidth={1.5} fill="url(#officeAnalyticsAreaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#c9d6e3] bg-[#f8fafc] py-8">
              <p className="text-sm text-[#5a5a5a]">لا توجد بيانات</p>
            </div>
          )}
        </section>

        {/* جدول المكاتب والمعاملات */}
        <section className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} p-4 shadow-sm`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-[#1e3a5f]">المكاتب وعدد المعاملات</h3>
            <input
              type="search"
              placeholder="بحث عن مكتب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${BORDER_RADIUS} w-48 border border-[#c9d6e3] bg-white px-3 py-2 text-sm text-[#1B1B1B] placeholder:text-[#9ca3af] focus:border-[#1e3a5f]/50 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20`}
            />
          </div>

          {loading ? (
            <div className="mt-4 py-12 text-center text-[#5a5a5a]">جاري التحميل…</div>
          ) : filteredOffices.length === 0 ? (
            <div className="mt-4 py-12 text-center text-[#5a5a5a]">لا توجد مكاتب</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px] text-right">
                <thead>
                  <tr className="border-b border-[#c9d6e3] text-sm font-medium text-[#5a5a5a]">
                    <th className="py-3 pr-2">المكتب</th>
                    <th className="py-3 pr-2">النوع</th>
                    <th className="py-3 pr-2">الإجمالي</th>
                    <th className="py-3 pr-2">قيد التنفيذ</th>
                    <th className="py-3 pr-2">منجزة</th>
                    <th className="py-3 pr-2">متأخرة</th>
                    <th className="py-3 pl-2">تفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOffices.map((o) => (
                    <React.Fragment key={o.id}>
                      <tr
                        className={`border-b border-[#c9d6e3]/80 transition ${
                          expandedOfficeId === o.id ? "bg-[#f0f4f8]" : "hover:bg-[#f8fafc]"
                        }`}
                      >
                        <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{o.name}</td>
                        <td className="py-3 pr-2 text-[#5a5a5a]">{o.type || "—"}</td>
                        <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{o.total}</td>
                        <td className="py-3 pr-2">
                          <span className={o.pending > 0 ? "font-medium text-amber-600" : "text-[#5a5a5a]"}>{o.pending}</span>
                        </td>
                        <td className="py-3 pr-2">
                          <span className={o.done > 0 ? "font-medium text-[#1E6B3A]" : "text-[#5a5a5a]"}>{o.done}</span>
                        </td>
                        <td className="py-3 pr-2">
                          <span className={o.overdue > 0 ? "font-medium text-red-600" : "text-[#5a5a5a]"}>{o.overdue}</span>
                        </td>
                        <td className="py-3 pl-2">
                          <button
                            type="button"
                            onClick={() => setExpandedOfficeId(expandedOfficeId === o.id ? null : o.id)}
                            className="rounded-lg border border-[#c9d6e3] bg-white px-3 py-1.5 text-sm font-medium text-[#1e3a5f] transition hover:bg-[#f0f4f8]"
                          >
                            {expandedOfficeId === o.id ? "إخفاء" : "عرض المعاملات"}
                          </button>
                        </td>
                      </tr>
                      {expandedOfficeId === o.id && (
                        <tr>
                          <td colSpan={7} className="bg-[#f8fafc] p-4">
                            <div className="rounded-lg border border-[#c9d6e3] bg-white p-4">
                              <h4 className="mb-3 text-sm font-semibold text-[#1e3a5f]">معاملات مكتب {o.name}</h4>
                              {transactionsLoading ? (
                                <p className="py-6 text-center text-sm text-[#5a5a5a]">جاري التحميل…</p>
                              ) : officeTransactions.length === 0 ? (
                                <p className="py-6 text-center text-sm text-[#5a5a5a]">لا توجد معاملات</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[500px] text-right text-sm">
                                    <thead>
                                      <tr className="border-b border-[#c9d6e3] text-[#5a5a5a]">
                                        <th className="py-2 pr-2">المواطن</th>
                                        <th className="py-2 pr-2">الحالة</th>
                                        <th className="py-2 pr-2">تاريخ الإنشاء</th>
                                        <th className="py-2 pr-2">تاريخ الإنجاز</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {officeTransactions.slice(0, 30).map((t) => (
                                        <tr key={t.id} className="border-b border-[#c9d6e3]/60">
                                          <td className="py-2 pr-2 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                                          <td className="py-2 pr-2">
                                            <span
                                              className={`font-medium ${
                                                t.status === "DONE" ? "text-[#1E6B3A]" : t.status === "OVERDUE" ? "text-red-600" : "text-amber-600"
                                              }`}
                                            >
                                              {STATUS_LABELS[t.status] || t.status}
                                            </span>
                                          </td>
                                          <td className="py-2 pr-2 text-[#5a5a5a]">{formatDate(t.createdAt)}</td>
                                          <td className="py-2 pr-2 text-[#5a5a5a]">{t.completedAt ? formatDate(t.completedAt) : "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {officeTransactions.length > 30 && (
                                    <p className="mt-2 text-xs text-[#5a5a5a]">عرض 30 من أصل {officeTransactions.length} معاملة</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
