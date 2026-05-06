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
  AreaChart,
  Area,
} from "recharts";

const BORDER_RADIUS = "rounded-xl";
const CARD_BG = "bg-white";
const BORDER_COLOR = "border-[#c9d6e3]";
const OFFICIAL_BG = "bg-[#f0f4f8]";
const ACCENT_NAVY = "#1e3a5f";
const ACCENT_GREEN = "#1E6B3A";

const SOURCE_SECTION_LABELS: Record<string, string> = {
  RECEPTION: "الاستقبال",
  COORDINATOR: "المتابعة",
  DOCUMENTATION: "التوثيق",
  ADMIN: "مدير المكتب",
  SORTING: "الفرز",
};

const PERIOD_OPTIONS = [
  { value: "day", label: "اليوم" },
  { value: "week", label: "أسبوع" },
  { value: "months:30", label: "شهر" },
];

type Stats = {
  userCount: number;
  officeCount: number;
  completionRate: number;
  totalTransactions: number;
  transactionsToday: number;
  overdueCount: number;
  delegateCount: number;
  avgCompletionMinutes: number | null;
  systemStatus?: string;
  alerts?: { slaExceeded: { id: string; citizenName: string | null; officeName: string }[]; inactiveOffices: { id: string; name: string }[] };
};

type AccountsSummary = {
  accounts: {
    total: number;
    adminAccounts: number;
    delegates: number;
    enabled: number;
    disabled: number;
  };
  parliamentMembers: {
    total: number;
    enabled: number;
    disabled: number;
  };
};

type MinistriesSummary = {
  totalFormations: number;
  totalSubDepartments: number;
  byType: Record<string, number>;
};

type ReportData = {
  timelineData: { date: string; count: number }[];
  statusData: { name: string; value: number; fill: string }[];
  officesData: { name: string; value: number }[];
  delegatesData: { name: string; value: number }[];
  transactionTypes: { name: string; value: number }[];
  overdueList: { id: string; citizenName: string | null; officeName: string }[];
  inactiveOffices: { id: string; name: string }[];
  sourceSectionBreakdown: { name: string; value: number }[];
  accountsSummary?: AccountsSummary;
  ministriesSummary?: MinistriesSummary;
};

function formatDate(s: string): string {
  try {
    return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "short", numberingSystem: "arab" }).format(new Date(s));
  } catch {
    return s;
  }
}

function formatReportDate(): string {
  return new Intl.DateTimeFormat("ar-IQ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    numberingSystem: "arab",
  }).format(new Date());
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("months:30");
  const [officeId, setOfficeId] = useState("");
  const [offices, setOffices] = useState<{ id: string; name: string }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, reportRes, officesRes] = await Promise.all([
        fetch("/api/super-admin/stats", { credentials: "include" }),
        fetch(`/api/super-admin/reports?period=${period}${officeId ? `&officeId=${officeId}` : ""}`, {
          credentials: "include",
        }),
        fetch("/api/super-admin/offices", { credentials: "include" }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (reportRes.ok) setReport(await reportRes.json());
      if (officesRes.ok) {
        const list = await officesRes.json();
        setOffices(Array.isArray(list) ? list : []);
      }
    } finally {
      setLoading(false);
    }
  }, [period, officeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(loadData);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;

  return (
    <div className={`min-h-screen ${OFFICIAL_BG} pb-8`} dir="rtl">
      {/* ترويسة التقارير */}
      <div
        className={`mb-6 ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} px-5 py-5 shadow-sm print:shadow-none sm:mb-8`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">التقارير الشاملة</h1>
            <p className="mt-1 text-sm text-[#5a6c7d]">
              تقارير تفصيلية لأداء النظام، المعاملات، المكاتب، والمخولين — بوابة الصادقون
            </p>
            <p className="mt-2 text-xs text-[#5a6c7d]">تاريخ التقرير: {formatReportDate()}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#1e3a5f]/20 bg-[#1e3a5f]/5">
              <svg className="h-6 w-6 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="hidden rounded-xl border border-[#c9d6e3] bg-white px-4 py-2.5 text-sm font-medium text-[#1e3a5f] shadow-sm transition hover:bg-[#f0f4f8] print:hidden"
            >
              طباعة التقرير
            </button>
          </div>
        </div>
      </div>

      {/* الفلاتر */}
      <section
        className={`mb-6 flex flex-wrap items-center gap-3 ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} px-4 py-3 shadow-sm print:hidden`}
      >
        <span className="text-sm font-medium text-[#5a6c7d]">الفترة:</span>
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={`${BORDER_RADIUS} px-4 py-2 text-sm font-medium transition ${
              period === p.value ? "bg-[#1e3a5f] text-white" : "border border-[#c9d6e3] bg-white text-[#1e3a5f] hover:bg-[#f0f4f8]"
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="mr-2 text-sm font-medium text-[#5a6c7d]">المكتب:</span>
        <select
          value={officeId}
          onChange={(e) => setOfficeId(e.target.value)}
          className={`${BORDER_RADIUS} border border-[#c9d6e3] bg-white px-3 py-2 text-sm text-[#1e3a5f]`}
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
          onClick={loadData}
          className="flex items-center gap-2 rounded-xl border border-[#c9d6e3] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-[#f0f4f8]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          تحديث
        </button>
      </section>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ١. الملخص التنفيذي */}
          <section className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
            <div className="border-b border-[#c9d6e3] bg-[#1e3a5f] px-5 py-3">
              <h2 className="text-base font-bold text-white">١. الملخص التنفيذي</h2>
              <p className="mt-0.5 text-xs text-white/80">نظرة شاملة على أداء النظام</p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-4">
                <p className="text-xs font-medium text-[#5a6c7d]">نسبة الإنجاز</p>
                <p className="mt-1 text-2xl font-bold text-[#1e3a5f]">{stats?.completionRate ?? 0}%</p>
              </div>
              <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-4">
                <p className="text-xs font-medium text-[#5a6c7d]">إجمالي المعاملات</p>
                <p className="mt-1 text-2xl font-bold text-[#1e3a5f]">{stats?.totalTransactions ?? 0}</p>
              </div>
              <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-4">
                <p className="text-xs font-medium text-[#5a6c7d]">المعاملات المتأخرة</p>
                <p className="mt-1 text-2xl font-bold text-red-600">{stats?.overdueCount ?? 0}</p>
              </div>
              <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-4">
                <p className="text-xs font-medium text-[#5a6c7d]">متوسط زمن الإنجاز (SLA)</p>
                <p className="mt-1 text-2xl font-bold text-[#1e3a5f]">
                  {stats?.avgCompletionMinutes != null ? `${stats.avgCompletionMinutes} دقيقة` : "—"}
                </p>
              </div>
            </div>
          </section>

          {/* ٢. تقرير المعاملات عبر الزمن */}
          <section className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
            <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-3">
              <h2 className="text-base font-bold text-[#1e3a5f]">٢. حركة المعاملات — آخر {periodLabel}</h2>
              <p className="mt-0.5 text-xs text-[#5a6c7d]">عدد المعاملات المُنشأة يومياً</p>
            </div>
            <div className="p-5">
              {report?.timelineData && report.timelineData.length > 0 ? (
                <div className="min-h-[256px] w-full" style={{ minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={256} minHeight={256}>
                    <AreaChart data={report.timelineData}>
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={ACCENT_NAVY} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={ACCENT_NAVY} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number | undefined) => [v ?? 0, "معاملة"]} labelFormatter={(v) => formatDate(v)} />
                      <Area type="monotone" dataKey="count" stroke={ACCENT_NAVY} fill="url(#areaGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-[#5a6c7d]">لا توجد بيانات للفترة المحددة</p>
              )}
            </div>
          </section>

          {/* ٣. توزيع الحالات + أنواع المعاملات */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
              <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-3">
                <h2 className="text-base font-bold text-[#1e3a5f]">٣. توزيع الحالات</h2>
                <p className="mt-0.5 text-xs text-[#5a6c7d]">قيد التنفيذ، منجزة، متأخرة</p>
              </div>
              <div className="p-5">
                {report?.statusData && report.statusData.some((d) => d.value > 0) ? (
                  <div className="mx-auto min-h-[256px] w-full" style={{ minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={256} minHeight={256}>
                      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                        <Pie
                          data={report.statusData}
                          cx="50%"
                          cy="45%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          isAnimationActive={false}
                        >
                          {report.statusData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 12 }} />
                        <Tooltip formatter={(v: number | undefined) => [v ?? 0, "معاملة"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-8 text-center text-[#5a6c7d]">لا توجد بيانات</p>
                )}
              </div>
            </div>
            <div className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
              <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-3">
                <h2 className="text-base font-bold text-[#1e3a5f]">٤. أنواع المعاملات</h2>
                <p className="mt-0.5 text-xs text-[#5a6c7d]">أعلى ٨ أنواع حسب العدد</p>
              </div>
              <div className="p-5">
                {report?.transactionTypes && report.transactionTypes.length > 0 ? (
                  <div className="space-y-4">
                    {(() => {
                      const maxVal = Math.max(...report.transactionTypes.map((t) => t.value), 1);
                      return report.transactionTypes.map((item) => (
                        <div key={item.name} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <div
                            className="min-w-[180px] max-w-[220px] shrink-0 text-sm text-[#1e3a5f]"
                            title={item.name}
                          >
                            {item.name}
                          </div>
                          <div className="flex-1 min-w-[80px]">
                            <div
                              className="h-7 rounded-md"
                              style={{
                                backgroundColor: ACCENT_NAVY,
                                width: `${Math.max((item.value / maxVal) * 100, 4)}%`,
                                minWidth: item.value > 0 ? "4px" : 0,
                              }}
                            />
                          </div>
                          <span className="shrink-0 w-12 text-left text-xs font-medium text-[#5a6c7d]">
                            {item.value}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <p className="py-8 text-center text-[#5a6c7d]">لا توجد بيانات</p>
                )}
              </div>
            </div>
          </section>

          {/* ٥. أداء المكاتب والمخولين */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
              <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-3">
                <h2 className="text-base font-bold text-[#1e3a5f]">٥. أداء المكاتب (المنجزة)</h2>
                <p className="mt-0.5 text-xs text-[#5a6c7d]">أعلى ١٠ مكاتب حسب المعاملات المنجزة</p>
              </div>
              <div className="p-5">
                {report?.officesData && report.officesData.length > 0 ? (
                  <div className="min-h-[224px] w-full" style={{ minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={224} minHeight={224}>
                      <BarChart data={report.officesData} margin={{ bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number | undefined) => [v ?? 0, "معاملة"]} />
                        <Bar dataKey="value" fill={ACCENT_GREEN} radius={[4, 4, 0, 0]} name="منجزة" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-8 text-center text-[#5a6c7d]">لا توجد بيانات</p>
                )}
              </div>
            </div>
            <div className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
              <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-3">
                <h2 className="text-base font-bold text-[#1e3a5f]">٦. أداء المخولين</h2>
                <p className="mt-0.5 text-xs text-[#5a6c7d]">أعلى ١٠ مخولين حسب المعاملات المنجزة</p>
              </div>
              <div className="p-5">
                {report?.delegatesData && report.delegatesData.length > 0 ? (
                  <div className="min-h-[224px] w-full" style={{ minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={224} minHeight={224}>
                      <BarChart data={report.delegatesData} margin={{ bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number | undefined) => [v ?? 0, "معاملة"]} />
                        <Bar dataKey="value" fill="#B08D57" radius={[4, 4, 0, 0]} name="منجزة" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-8 text-center text-[#5a6c7d]">لا توجد بيانات</p>
                )}
              </div>
            </div>
          </section>

          {/* ٧. الحسابات وأعضاء مجلس النواب */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
              <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-3">
                <h2 className="text-base font-bold text-[#1e3a5f]">٧. الحسابات وعددها</h2>
                <p className="mt-0.5 text-xs text-[#5a6c7d]">إجمالي الحسابات من صفحة المستخدمين</p>
              </div>
              <div className="p-5">
                {report?.accountsSummary ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-3">
                        <p className="text-xs font-medium text-[#5a6c7d]">إجمالي الحسابات</p>
                        <p className="mt-1 text-xl font-bold text-[#1e3a5f]">{report.accountsSummary.accounts.total}</p>
                      </div>
                      <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-3">
                        <p className="text-xs font-medium text-[#5a6c7d]">حسابات الإداريين</p>
                        <p className="mt-1 text-xl font-bold text-[#1e3a5f]">{report.accountsSummary.accounts.adminAccounts}</p>
                      </div>
                      <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-3">
                        <p className="text-xs font-medium text-[#5a6c7d]">حسابات المخولين</p>
                        <p className="mt-1 text-xl font-bold text-[#1e3a5f]">{report.accountsSummary.accounts.delegates}</p>
                      </div>
                      <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-3">
                        <p className="text-xs font-medium text-[#5a6c7d]">المفعلة / المعطلة</p>
                        <p className="mt-1 text-lg font-bold">
                          <span className="text-[#1E6B3A]">{report.accountsSummary.accounts.enabled}</span>
                          <span className="mx-1 text-[#5a6c7d]">/</span>
                          <span className="text-amber-600">{report.accountsSummary.accounts.disabled}</span>
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/super-admin/users"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#c9d6e3] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-[#f0f4f8] print:hidden"
                    >
                      عرض صفحة المستخدمين
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                ) : (
                  <p className="py-6 text-center text-[#5a6c7d]">لا توجد بيانات</p>
                )}
              </div>
            </div>
            <div className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
              <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-3">
                <h2 className="text-base font-bold text-[#1e3a5f]">٨. حسابات أعضاء مجلس النواب</h2>
                <p className="mt-0.5 text-xs text-[#5a6c7d]">عدد الحسابات البرلمانية المسجلة</p>
              </div>
              <div className="p-5">
                {report?.accountsSummary ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-3">
                        <p className="text-xs font-medium text-[#5a6c7d]">إجمالي الأعضاء</p>
                        <p className="mt-1 text-xl font-bold text-[#1e3a5f]">{report.accountsSummary.parliamentMembers.total}</p>
                      </div>
                      <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-3">
                        <p className="text-xs font-medium text-[#5a6c7d]">المفعلين</p>
                        <p className="mt-1 text-xl font-bold text-[#1E6B3A]">{report.accountsSummary.parliamentMembers.enabled}</p>
                      </div>
                      <div className="col-span-2 rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-3">
                        <p className="text-xs font-medium text-[#5a6c7d]">المعطلين</p>
                        <p className="mt-1 text-xl font-bold text-amber-600">{report.accountsSummary.parliamentMembers.disabled}</p>
                      </div>
                    </div>
                    <Link
                      href="/super-admin/parliament-members"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#c9d6e3] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-[#f0f4f8] print:hidden"
                    >
                      عرض صفحة أعضاء النواب
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                ) : (
                  <p className="py-6 text-center text-[#5a6c7d]">لا توجد بيانات</p>
                )}
              </div>
            </div>
          </section>

          {/* ٩. الوزارات والهيئات والدوائر والتشكيلات */}
          <section className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
            <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-3">
              <h2 className="text-base font-bold text-[#1e3a5f]">٩. الوزارات والهيئات والدوائر والتشكيلات</h2>
              <p className="mt-0.5 text-xs text-[#5a6c7d]">إحصائيات التشكيلات والدوائر الفرعية من صفحة الوزارات</p>
            </div>
            <div className="p-5">
              {report?.ministriesSummary ? (
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-3">
                        <p className="text-xs font-medium text-[#5a6c7d]">عدد التشكيلات الكلية</p>
                        <p className="mt-1 text-xl font-bold text-[#1e3a5f]">{report.ministriesSummary.totalFormations}</p>
                      </div>
                      <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-3">
                        <p className="text-xs font-medium text-[#5a6c7d]">عدد الدوائر الفرعية</p>
                        <p className="mt-1 text-xl font-bold text-[#1e3a5f]">{report.ministriesSummary.totalSubDepartments}</p>
                      </div>
                    </div>
                    {Object.keys(report.ministriesSummary.byType).length > 0 && (
                      <div className="rounded-lg border border-[#c9d6e3] bg-[#f8fafc] p-3">
                        <p className="text-xs font-medium text-[#5a6c7d]">التوزيع حسب النوع (وزارة، هيئة، دوائر، إلخ)</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(report.ministriesSummary.byType).map(([type, count]) => (
                            <span
                              key={type}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#c9d6e3] bg-white px-3 py-1.5 text-sm"
                            >
                              <span className="text-[#1B1B1B]">{type}</span>
                              <span className="rounded-full bg-[#1e3a5f]/10 px-2 py-0.5 text-xs font-bold text-[#1e3a5f]">{count}</span>
                            </span>
                          ))}
                          </div>
                        </div>
                      )}
                  </div>
                  <Link
                    href="/super-admin/ministries"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#c9d6e3] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-[#f0f4f8] print:hidden"
                  >
                    عرض صفحة الوزارات والدوائر
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <p className="py-6 text-center text-[#5a6c7d]">لا توجد بيانات</p>
              )}
            </div>
          </section>

          {/* ١٠. حسب القسم المصدر */}
          {report?.sourceSectionBreakdown && report.sourceSectionBreakdown.length > 0 && (
            <section className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
              <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-3">
                <h2 className="text-base font-bold text-[#1e3a5f]">١٠. حسب القسم المصدر</h2>
                <p className="mt-0.5 text-xs text-[#5a6c7d]">صفحة الاستقبال، المتابعة، التوثيق، إلخ</p>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-3">
                  {report.sourceSectionBreakdown.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#c9d6e3] bg-white px-4 py-2 text-sm"
                    >
                      <span className="font-medium text-[#1B1B1B]">
                        {SOURCE_SECTION_LABELS[item.name] || item.name}
                      </span>
                      <span className="rounded-full bg-[#1e3a5f]/10 px-2.5 py-0.5 text-xs font-bold text-[#1e3a5f]">
                        {item.value}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ١١. التنبيهات والتوصيات */}
          <section className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
            <div className="border-b border-[#c9d6e3] bg-amber-50 px-5 py-3">
              <h2 className="text-base font-bold text-amber-800">١١. التنبيهات والتوصيات</h2>
              <p className="mt-0.5 text-xs text-amber-700">معاملات متأخرة ومكاتب غير نشطة</p>
            </div>
            <div className="grid gap-6 p-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1B1B1B]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
                    !
                  </span>
                  المعاملات المتأخرة ({report?.overdueList?.length ?? 0})
                </h3>
                {report?.overdueList && report.overdueList.length > 0 ? (
                  <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-[#c9d6e3] bg-white p-3">
                    {report.overdueList.slice(0, 10).map((t) => (
                      <li key={t.id} className="flex justify-between gap-2 text-sm">
                        <span className="truncate text-[#1B1B1B]">{t.citizenName || "—"}</span>
                        <span className="shrink-0 text-[#5a6c7d]">{t.officeName}</span>
                      </li>
                    ))}
                    {report.overdueList.length > 10 && (
                      <li className="text-xs text-[#5a6c7d]">و {report.overdueList.length - 10} أخرى</li>
                    )}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-[#c9d6e3] bg-green-50/50 p-4 text-sm text-green-800">
                    لا توجد معاملات متأخرة
                  </p>
                )}
              </div>
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1B1B1B]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    !
                  </span>
                  المكاتب غير النشطة (آخر ٣٠ يوماً) ({report?.inactiveOffices?.length ?? 0})
                </h3>
                {report?.inactiveOffices && report.inactiveOffices.length > 0 ? (
                  <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-[#c9d6e3] bg-white p-3">
                    {report.inactiveOffices.slice(0, 10).map((o) => (
                      <li key={o.id} className="text-sm">
                        <Link href={`/super-admin/offices`} className="text-[#1e3a5f] hover:underline">
                          {o.name}
                        </Link>
                      </li>
                    ))}
                    {report.inactiveOffices.length > 10 && (
                      <li className="text-xs text-[#5a6c7d]">و {report.inactiveOffices.length - 10} أخرى</li>
                    )}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-[#c9d6e3] bg-green-50/50 p-4 text-sm text-green-800">
                    جميع المكاتب نشطة
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* روابط سريعة */}
          <section className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} p-5 shadow-sm print:hidden`}>
            <h2 className="mb-3 text-sm font-bold text-[#1e3a5f]">روابط سريعة</h2>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/super-admin"
                className="rounded-lg border border-[#c9d6e3] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-[#f0f4f8]"
              >
                لوحة التحكم
              </Link>
              <Link
                href="/super-admin/users"
                className="rounded-lg border border-[#c9d6e3] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-[#f0f4f8]"
              >
                المستخدمين
              </Link>
              <Link
                href="/super-admin/parliament-members"
                className="rounded-lg border border-[#c9d6e3] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-[#f0f4f8]"
              >
                أعضاء مجلس النواب
              </Link>
              <Link
                href="/super-admin/ministries"
                className="rounded-lg border border-[#c9d6e3] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-[#f0f4f8]"
              >
                الوزارات والدوائر
              </Link>
              <Link
                href="/super-admin/citizens"
                className="rounded-lg border border-[#c9d6e3] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-[#f0f4f8]"
              >
                تحليلات المكاتب
              </Link>
              <Link
                href="/super-admin/offices"
                className="rounded-lg border border-[#c9d6e3] bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-[#f0f4f8]"
              >
                إدارة المكاتب
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
