"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
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

type TimelinePoint = { date: string; count: number };
type StatusPoint = { name: string; value: number; fill: string };
type Stats = {
  officeName: string;
  transactionsToday: number;
  totalTransactions: number;
  doneTransactions: number;
  overdueCount: number;
  completionRate: number;
};
type SectionStat = { section: string; summary: string };
type StaffMember = { id: string; name: string | null; email: string; roleLabel: string; enabled: boolean };

function formatDate(d: string) {
  return new Intl.DateTimeFormat("ar-IQ", { month: "short", day: "numeric", numberingSystem: "arab" }).format(new Date(d));
}

function formatDateFull(d: Date) {
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "long",
    numberingSystem: "arab",
  }).format(d);
}

function escapeCsvCell(val: string): string {
  const s = String(val ?? "").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AdminReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState("months:30");
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [statusData, setStatusData] = useState<StatusPoint[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sectionStats, setSectionStats] = useState<SectionStat[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [timelineRes, statusRes, statsRes, sectionsRes, staffRes] = await Promise.all([
        fetch(`/api/admin/charts?chart=timeline&period=${period}`),
        fetch("/api/admin/charts?chart=status"),
        fetch("/api/admin/stats"),
        fetch("/api/admin/sections-summary"),
        fetch("/api/admin/staff"),
      ]);
      if (timelineRes.ok) setTimelineData(await timelineRes.json());
      if (statusRes.ok) setStatusData(await statusRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (sectionsRes.ok) {
        const s = await sectionsRes.json();
        setSectionStats(s.sectionStats || []);
      }
      if (staffRes.ok) {
        const s = await staffRes.json();
        setStaff(
          (s.staff || []).map((u: { id: string; name: string | null; email: string; roleLabel: string; enabled: boolean }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            roleLabel: u.roleLabel,
            enabled: u.enabled,
          }))
        );
      }
    } catch {
      //
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(() => loadData({ silent: true }));

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const reportForExcel = useMemo(() => {
    const rows: string[][] = [];
    if (!stats) return rows;
    const d = new Date();
    rows.push(["تقرير المكتب — بوابة الصادقون", ""]);
    rows.push([`التاريخ: ${formatDateFull(d)}`, ""]);
    rows.push([`المكتب: ${stats.officeName}`, ""]);
    rows.push([], []);
    rows.push(["الإحصائيات العامة", "القيمة"]);
    rows.push(["معاملات اليوم", String(stats.transactionsToday)]);
    rows.push(["إجمالي المعاملات", String(stats.totalTransactions)]);
    rows.push(["معاملات منجزة", String(stats.doneTransactions)]);
    rows.push(["معاملات متأخرة", String(stats.overdueCount)]);
    rows.push(["نسبة الإنجاز %", String(stats.completionRate)]);
    rows.push([], []);
    rows.push(["توزيع الحالة", "العدد"]);
    statusData.forEach((s) => rows.push([s.name, String(s.value)]));
    rows.push([], []);
    rows.push(["الاسم", "البريد", "الدور", "الحالة"]);
    staff.forEach((u) => rows.push([u.name || "", u.email, u.roleLabel, u.enabled ? "مفعّل" : "معطّل"]));
    return rows;
  }, [stats, statusData, staff]);

  const downloadExcel = useCallback(() => {
    const csvContent = reportForExcel.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير-مكتب-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [reportForExcel]);

  const reportDate = formatDateFull(new Date());

  return (
    <div className="space-y-6" dir="rtl">
      {/* شريط الأدوات — يختفي عند الطباعة */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">التقارير</h1>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "week", label: "أسبوع" },
            { value: "months:30", label: "شهر" },
            { value: "month", label: "الشهر الحالي" },
          ].map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                period === p.value ? "bg-[#1E6B3A] text-white" : "border border-[#d4cfc8] bg-white text-[#1B1B1B] hover:bg-[#f6f3ed]"
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="h-4 w-px bg-[#d4cfc8]" />
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-4 py-2 text-sm font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
            title="طباعة التقرير أو حفظه كـ PDF"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة / PDF
          </button>
          <button
            type="button"
            onClick={downloadExcel}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-4 py-2 text-sm font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير Excel
          </button>
        </div>
      </div>

      {/* ورقة التقرير — تصميم A4 رسمي */}
      <div
        ref={reportRef}
        className="mx-auto w-full max-w-[210mm] rounded-lg border-2 border-[#1B1B1B]/10 bg-[#fefefe] shadow-lg print:max-w-none print:rounded-none print:border-0 print:shadow-none"
        style={{ minHeight: "297mm" }}
      >
        {/* رأس التقرير الرسمي */}
        <div className="border-b-2 border-[#1E6B3A] bg-[#f8faf8] px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#1B1B1B]">تقرير نشاط المكتب</h1>
              <p className="mt-1 text-sm text-[#5a5a5a]">بوابة الصادقون — نظام إدارة المعاملات</p>
            </div>
            <div className="text-left text-sm text-[#5a5a5a]">
              <p>التاريخ: {reportDate}</p>
              <p className="font-medium text-[#1B1B1B]">{stats?.officeName ?? "—"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-8 py-6">
          {/* الإحصائيات العامة */}
          <section>
            <h2 className="border-b border-[#d4cfc8] pb-2 text-base font-bold text-[#1B1B1B]">١. الإحصائيات العامة</h2>
            {loading ? (
              <p className="py-4 text-[#5a5a5a]">جاري التحميل…</p>
            ) : stats ? (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-lg border border-[#d4cfc8] bg-white p-4 text-center">
                  <p className="text-xs font-medium text-[#5a5a5a]">معاملات اليوم</p>
                  <p className="mt-1 text-2xl font-bold text-[#1B1B1B]">{stats.transactionsToday}</p>
                </div>
                <div className="rounded-lg border border-[#d4cfc8] bg-white p-4 text-center">
                  <p className="text-xs font-medium text-[#5a5a5a]">إجمالي المعاملات</p>
                  <p className="mt-1 text-2xl font-bold text-[#1B1B1B]">{stats.totalTransactions}</p>
                </div>
                <div className="rounded-lg border border-[#d4cfc8] bg-white p-4 text-center">
                  <p className="text-xs font-medium text-[#5a5a5a]">منجزة</p>
                  <p className="mt-1 text-2xl font-bold text-[#1E6B3A]">{stats.doneTransactions}</p>
                </div>
                <div className="rounded-lg border border-[#d4cfc8] bg-white p-4 text-center">
                  <p className="text-xs font-medium text-[#5a5a5a]">متأخرة</p>
                  <p className="mt-1 text-2xl font-bold text-[#b91c1c]">{stats.overdueCount}</p>
                </div>
                <div className="rounded-lg border border-[#d4cfc8] bg-white p-4 text-center sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-medium text-[#5a5a5a]">نسبة الإنجاز</p>
                  <p className="mt-1 text-2xl font-bold text-[#1E6B3A]">{stats.completionRate}%</p>
                </div>
              </div>
            ) : null}
          </section>

          {/* ملخص عمل الأقسام */}
          {sectionStats.length > 0 && (
            <section>
              <h2 className="border-b border-[#d4cfc8] pb-2 text-base font-bold text-[#1B1B1B]">٢. ملخص عمل الأقسام</h2>
              <ul className="mt-4 space-y-2">
                {sectionStats.map((s, i) => (
                  <li key={i} className="flex gap-2 rounded-lg border border-[#d4cfc8]/60 bg-[#fafaf9] px-4 py-3">
                    <span className="font-medium text-[#1B1B1B]">{s.section}:</span>
                    <span className="text-[#5a5a5a]">{s.summary}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* الرسوم البيانية */}
          <section>
            <h2 className="border-b border-[#d4cfc8] pb-2 text-base font-bold text-[#1B1B1B]">٣. الرسوم البيانية</h2>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-[#d4cfc8] bg-white p-4">
                <h3 className="text-sm font-semibold text-[#1B1B1B]">رسم المعاملات حسب التاريخ</h3>
                <div className="mt-3 h-64">
                  {loading ? (
                    <div className="flex h-full items-center justify-center text-[#5a5a5a]">جاري التحميل…</div>
                  ) : timelineData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-[#5a5a5a]">لا توجد بيانات</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={256}>
                      <AreaChart data={timelineData}>
                        <defs>
                          <linearGradient id="reportGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1E6B3A" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#1E6B3A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number | undefined) => [v ?? 0, "معاملة"]} labelFormatter={(l) => formatDate(l)} />
                        <Area type="monotone" dataKey="count" stroke="#1E6B3A" strokeWidth={2} fill="url(#reportGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-[#d4cfc8] bg-white p-4">
                <h3 className="text-sm font-semibold text-[#1B1B1B]">توزيع المعاملات حسب الحالة</h3>
                <div className="mt-3 flex h-64 items-center justify-center">
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
                      <Tooltip formatter={(v: number | undefined, _: string | undefined, p: { payload?: { name?: string } }) => [v ?? 0, p?.payload?.name ?? ""]} />
                      <Legend />
                    </PieChart>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* قائمة الموظفين */}
          {staff.length > 0 && (
            <section>
              <h2 className="border-b border-[#d4cfc8] pb-2 text-base font-bold text-[#1B1B1B]">٤. قائمة الموظفين والحسابات</h2>
              <div className="mt-4 overflow-hidden rounded-lg border border-[#d4cfc8]">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-[#f6f3ed]">
                      <th className="py-2 px-3 font-medium text-[#5a5a5a]">#</th>
                      <th className="py-2 px-3 font-medium text-[#5a5a5a]">الاسم</th>
                      <th className="py-2 px-3 font-medium text-[#5a5a5a]">البريد</th>
                      <th className="py-2 px-3 font-medium text-[#5a5a5a]">الدور</th>
                      <th className="py-2 px-3 font-medium text-[#5a5a5a]">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((u, i) => (
                      <tr key={i} className="border-t border-[#d4cfc8]/60">
                        <td className="py-2 px-3 text-[#5a5a5a]">{i + 1}</td>
                        <td className="py-2 px-3 font-medium text-[#1B1B1B]">{u.name || "—"}</td>
                        <td className="py-2 px-3 text-[#5a5a5a]">{u.email}</td>
                        <td className="py-2 px-3">{u.roleLabel}</td>
                        <td className="py-2 px-3">{u.enabled ? "مفعّل" : "معطّل"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* تذييل التقرير */}
          <div className="border-t border-[#d4cfc8] pt-6 text-center text-xs text-[#5a5a5a]">
            <p>تم إنشاء هذا التقرير آلياً من بوابة الصادقون</p>
            <p className="mt-1">للاستفسار يرجى مراجعة إدارة المنصة</p>
          </div>
        </div>
      </div>

    </div>
  );
}
