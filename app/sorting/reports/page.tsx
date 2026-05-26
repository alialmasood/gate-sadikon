"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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

type Transaction = {
  id: string;
  citizenName: string | null;
  citizenPhone: string | null;
  citizenAddress: string | null;
  status: string;
  transactionType: string | null;
  type: string | null;
  transactionTitle: string | null;
  serialNumber: string | null;
  submissionDate: string | null;
  createdAt: string;
  completedAt: string | null;
  delegateName: string | null;
  urgent?: boolean;
  cannotComplete?: boolean;
  cannotCompleteReason?: string | null;
  reachedSorting?: boolean;
  formationName: string | null;
  completedByAdmin?: boolean;
  officeName?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
};

const WORKFLOW_LABELS: Record<string, string> = {
  done: "منجزة",
  overdue: "متأخرة",
  cannotComplete: "تعذر إنجازها",
  atDelegate: "لدى المخول",
  urgent: "عاجلة — قسم المتابعة",
  atSorting: "قسم الفرز",
  atReception: "في الاستقبال",
};

const REPORT_BATCH_SIZE = 3000;

function formatDateShort(d: string) {
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      month: "short",
      day: "numeric",
      year: "2-digit",
      numberingSystem: "arab",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

function formatDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWorkflowStatus(t: Transaction): string {
  if (t.status === "DONE" || t.completedByAdmin) return "done";
  if (t.status === "OVERDUE") return "overdue";
  if (t.cannotComplete) return "cannotComplete";
  if (t.delegateName) return "atDelegate";
  if (t.urgent) return "urgent";
  if (t.reachedSorting) return "atSorting";
  return "atReception";
}

function getStatusLabel(t: Transaction): string {
  if (t.status === "DONE" || t.completedByAdmin) return "منجزة";
  return STATUS_LABELS[t.status] ?? t.status;
}

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val).replace(/"/g, '""');
  return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
}

export default function SortingReportsPage() {
  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const [dateFrom, setDateFrom] = useState(formatDateForInput(lastMonth));
  const [dateTo, setDateTo] = useState(formatDateForInput(today));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [officeFilter, setOfficeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const buildSearchParams = useCallback((offset = 0) => {
    const params = new URLSearchParams();
    params.set("limit", String(REPORT_BATCH_SIZE));
    if (offset > 0) params.set("offset", String(offset));
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params;
  }, [dateFrom, dateTo]);

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      let offset = 0;
      const merged: Transaction[] = [];

      while (true) {
        const res = await fetch(`/api/transactions?${buildSearchParams(offset).toString()}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setTransactions([]);
          return;
        }

        const batch = (data.transactions || []) as Transaction[];
        merged.push(...batch);

        if (batch.length < REPORT_BATCH_SIZE) break;
        offset += REPORT_BATCH_SIZE;
      }

      setTransactions(merged);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [buildSearchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(() => loadData({ silent: true }));

  const officeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      const officeName = t.officeName?.trim() || "غير محدد";
      map.set(officeName, (map.get(officeName) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([officeName, count]) => ({ officeName, count }))
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.officeName.localeCompare(b.officeName, "ar")));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!officeFilter) return transactions;
    return transactions.filter((t) => (t.officeName?.trim() || "غير محدد") === officeFilter);
  }, [transactions, officeFilter]);

  const total = filteredTransactions.length;
  const pending = filteredTransactions.filter(
    (t) => !t.urgent && !t.cannotComplete && !t.delegateName && !t.completedByAdmin && t.status !== "DONE"
  ).length;
  const done = filteredTransactions.filter((t) => t.status === "DONE" || t.completedByAdmin).length;
  const overdue = filteredTransactions.filter((t) => t.status === "OVERDUE").length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  const urgent = filteredTransactions.filter((t) => t.urgent).length;
  const delegated = filteredTransactions.filter((t) => t.delegateName).length;
  const cannotComplete = filteredTransactions.filter((t) => t.cannotComplete).length;

  const typeCounts = filteredTransactions.reduce<Record<string, number>>((acc, t) => {
    const type = t.transactionType || t.type || "غير محدد";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const typeData = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const workflowCounts = filteredTransactions.reduce<Record<string, number>>((acc, t) => {
    const w = getWorkflowStatus(t);
    acc[w] = (acc[w] || 0) + 1;
    return acc;
  }, {});
  const workflowData = Object.entries(workflowCounts).map(([key, value]) => ({
    name: WORKFLOW_LABELS[key] || key,
    value,
  }));
  const PIE_COLORS = ["#1E6B3A", "#b91c1c", "#6b7280", "#7C3AED", "#5B7C99", "#B08D57"];

  const dailyCounts = filteredTransactions.reduce<Record<string, number>>((acc, t) => {
    const d = (t.submissionDate || t.createdAt)?.slice(0, 10) ?? "";
    if (d) acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const dailyData = Object.entries(dailyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const statusData = [
    { name: "منجزة", value: done, fill: "#1E6B3A" },
    { name: "قيد التنفيذ", value: pending, fill: "#B08D57" },
    { name: "متأخرة", value: overdue, fill: "#b91c1c" },
  ].filter((s) => s.value > 0);

  const exportToExcel = () => {
    const headers = [
      "رقم المعاملة",
      "اسم المواطن",
      "الهاتف",
      "العنوان",
      "نوع المعاملة",
      "عنوان المعاملة",
      "التشكيل/الجهة",
      "مكتب الارتباط",
      "الحالة",
      "مسار العمل",
      "تاريخ التقديم",
      "تاريخ الإنشاء",
      "تاريخ الإنجاز",
      "المخول",
      "ملاحظات",
    ];
    const rows = filteredTransactions.map((t) => {
      const statusLabel = getStatusLabel(t);
      const workflow = WORKFLOW_LABELS[getWorkflowStatus(t)] ?? "";
      const subDate = t.submissionDate ? formatDateShort(t.submissionDate) : "";
      const createdDate = formatDateShort(t.createdAt);
      const completedDate = t.completedAt ? formatDateShort(t.completedAt) : "";
      const notes = t.cannotComplete ? (t.cannotCompleteReason ?? "تعذر الإنجاز") : "";
      return [
        t.serialNumber || "",
        t.citizenName || "",
        t.citizenPhone || "",
        t.citizenAddress || "",
        t.transactionType || t.type || "",
        t.transactionTitle || "",
        t.formationName || "",
        t.officeName || "",
        statusLabel,
        workflow,
        subDate,
        createdDate,
        completedDate,
        t.delegateName || "",
        notes,
      ].map(escapeCsv);
    });
    const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير_معاملات_فرز_${officeFilter || "كل_المكاتب"}_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 border-b border-[#d4cfc8] pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1B1B1B]">تقارير وإحصائيات</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            تقارير تفصيلية لمعاملات قسم الفرز مع إمكانية التصدير
            {officeFilter ? <span className="mr-2 text-[#7C3AED]">للمكتب: {officeFilter}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#5a5a5a]">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-[#d4cfc8] bg-white px-3 py-2 text-sm text-[#1B1B1B] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#5a5a5a]">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-[#d4cfc8] bg-white px-3 py-2 text-sm text-[#1B1B1B] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
            />
          </div>
          <div className="min-w-[220px]">
            <label className="mb-1 block text-xs font-medium text-[#5a5a5a]">مكتب الارتباط</label>
            <select
              value={officeFilter}
              onChange={(e) => setOfficeFilter(e.target.value)}
              className="w-full rounded-lg border border-[#d4cfc8] bg-white px-3 py-2 text-sm text-[#1B1B1B] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
            >
              <option value="">كل المكاتب</option>
              {officeBreakdown.map((item) => (
                <option key={item.officeName} value={item.officeName}>
                  {item.officeName} ({item.count})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="rounded-lg border border-[#7C3AED] bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6d28d9] disabled:opacity-60"
          >
            {loading ? "جاري التحميل…" : "تطبيق الفترة"}
          </button>
          <button
            type="button"
            onClick={exportToExcel}
            disabled={loading || total === 0}
            className="flex items-center gap-2 rounded-lg border border-[#5B7C99] bg-[#5B7C99] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4a6a85] disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير إكسل (CSV)
          </button>
        </div>
      </div>

      {officeBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setOfficeFilter("")}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              !officeFilter
                ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                : "border-[#d4cfc8] bg-white text-[#1B1B1B] hover:bg-[#f6f3ed]"
            }`}
          >
            <span className="font-medium">كل المكاتب</span>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold">{transactions.length}</span>
          </button>
          {officeBreakdown.map((item) => (
            <button
              key={item.officeName}
              type="button"
              onClick={() => setOfficeFilter(item.officeName)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                officeFilter === item.officeName
                  ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                  : "border-[#d4cfc8] bg-white text-[#1B1B1B] hover:bg-[#f6f3ed]"
              }`}
            >
              <span className="font-medium">{item.officeName}</span>
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-bold">{item.count}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent" />
        </div>
      ) : (
        <>
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">ملخص حالة المعاملات</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">
                الفترة: {formatDateShort(dateFrom)} — {formatDateShort(dateTo)}
                {officeFilter ? ` | المكتب: ${officeFilter}` : " | جميع مكاتب الارتباط"}
              </p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#7C3AED] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">إجمالي المعاملات</p>
                <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{total}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#B08D57] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">قيد التنفيذ</p>
                <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{pending}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">منجزة</p>
                <p className="mt-2 text-2xl font-bold text-[#1E6B3A]">{done}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#b91c1c] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">متأخرة</p>
                <p className="mt-2 text-2xl font-bold text-[#b91c1c]">{overdue}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#7C3AED] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">نسبة الإنجاز</p>
                <p className="mt-2 text-2xl font-bold text-[#7C3AED]">{completionRate}%</p>
              </div>
              <div className="flex flex-col rounded-xl border border-amber-200 border-r-4 border-r-amber-400 bg-amber-50/50 p-4 shadow-sm">
                <p className="text-sm font-medium text-amber-700">عاجل</p>
                <p className="mt-2 text-2xl font-bold text-amber-700">{urgent}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-slate-200 border-r-4 border-r-slate-400 bg-slate-50/50 p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-700">تعذر إنجازها</p>
                <p className="mt-2 text-2xl font-bold text-slate-700">{cannotComplete}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#1E6B3A]/30 border-r-4 border-r-[#1E6B3A] bg-[#ccfbf1]/30 p-4 shadow-sm">
                <p className="text-sm font-medium text-[#0f766e]">محوّلة للمخولين</p>
                <p className="mt-2 text-2xl font-bold text-[#0f766e]">{delegated}</p>
              </div>
            </div>
          </article>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
                <h2 className="text-base font-semibold text-[#1B1B1B]">المعاملات المسجلة يومياً</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">عدد المعاملات لكل يوم في الفترة المحددة</p>
              </div>
              <div className="h-72 min-h-[200px] px-6 py-4" style={{ minWidth: 0 }}>
                {dailyData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[#5a5a5a]">لا توجد بيانات</div>
                ) : (
                  <ResponsiveContainer width="100%" height={288} minHeight={200}>
                    <BarChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v) => [Number(v ?? 0), "معاملة"]}
                        labelFormatter={(l) => formatDateShort(l)}
                        contentStyle={{ borderRadius: "12px", border: "1px solid #d4cfc8" }}
                      />
                      <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
                <h2 className="text-base font-semibold text-[#1B1B1B]">توزيع الحالة</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">توزيع المعاملات بين منجزة وقيد التنفيذ ومتأخرة</p>
              </div>
              <div className="flex h-72 items-center justify-center px-6 py-4">
                {statusData.length === 0 ? (
                  <p className="text-[#5a5a5a]">لا توجد معاملات</p>
                ) : (
                  <PieChart width={280} height={240}>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={statusData[i].fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, n) => [`${Number(v ?? 0)} (${total > 0 ? Math.round((Number(v ?? 0) / total) * 100) : 0}%)`, n ?? ""]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #d4cfc8" }}
                    />
                    <Legend />
                  </PieChart>
                )}
              </div>
            </article>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
                <h2 className="text-base font-semibold text-[#1B1B1B]">تقرير المعاملات حسب النوع</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">عدد المعاملات لكل نوع معاملة</p>
              </div>
              <div className="max-h-80 overflow-y-auto p-6">
                {typeData.length === 0 ? (
                  <p className="py-8 text-center text-[#5a5a5a]">لا توجد معاملات</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[300px] text-right text-sm">
                      <thead>
                        <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                          <th className="px-3 py-2 font-medium text-[#5a5a5a]">نوع المعاملة</th>
                          <th className="px-3 py-2 font-medium text-[#5a5a5a]">العدد</th>
                          <th className="px-3 py-2 font-medium text-[#5a5a5a]">النسبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {typeData.map(({ name, value }) => (
                          <tr key={name} className="border-b border-[#d4cfc8]/80">
                            <td className="px-3 py-2 font-medium text-[#1B1B1B]">{name}</td>
                            <td className="px-3 py-2 text-[#7C3AED]">{value}</td>
                            <td className="px-3 py-2 text-[#5a5a5a]">{total > 0 ? Math.round((value / total) * 100) : 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
                <h2 className="text-base font-semibold text-[#1B1B1B]">تقرير مسار العمل</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">مواقع المعاملات في سير العمل</p>
              </div>
              <div className="max-h-80 overflow-y-auto p-6">
                {workflowData.length === 0 ? (
                  <p className="py-8 text-center text-[#5a5a5a]">لا توجد معاملات</p>
                ) : (
                  <ul className="space-y-2">
                    {workflowData.map((item, i) => (
                      <li key={item.name} className="flex items-center justify-between rounded-lg border border-[#d4cfc8] bg-[#f6f3ed]/30 px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-sm font-medium text-[#1B1B1B]">{item.name}</span>
                        </span>
                        <span className="rounded-full bg-[#7C3AED]/10 px-3 py-0.5 text-sm font-medium text-[#7C3AED]">
                          {item.value}
                          {total > 0 ? ` (${Math.round((item.value / total) * 100)}%)` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </div>

          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <div>
                <h2 className="text-base font-semibold text-[#1B1B1B]">تقرير حسب مكتب الارتباط</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">توزيع المعاملات في الفترة الحالية على مكاتب الارتباط</p>
              </div>
              <Link
                href={officeFilter ? `/sorting/transactions?office=${encodeURIComponent(officeFilter)}` : "/sorting/transactions"}
                className="rounded-lg border border-[#7C3AED]/50 bg-[#7C3AED]/10 px-3 py-2 text-sm font-medium text-[#7C3AED] transition hover:bg-[#7C3AED]/20"
              >
                فتح صفحة المعاملات
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-right text-sm">
                <thead>
                  <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                    <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">مكتب الارتباط</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">العدد</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">النسبة</th>
                    <th className="px-3 py-2 font-medium text-[#5a5a5a]">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {officeBreakdown.map((item) => (
                    <tr key={item.officeName} className="border-b border-[#d4cfc8]/80">
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-2 font-medium text-[#1B1B1B]">{item.officeName}</td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-2 text-[#7C3AED]">{item.count}</td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-2 text-[#5a5a5a]">
                        {transactions.length > 0 ? Math.round((item.count / transactions.length) * 100) : 0}%
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setOfficeFilter(item.officeName)}
                          className="text-[#7C3AED] underline hover:no-underline"
                        >
                          عرض التقرير
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {overdue > 0 && (
            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="border-b border-[#d4cfc8] bg-red-50/50 px-6 py-3">
                <h2 className="text-base font-semibold text-[#1B1B1B]">تقرير المعاملات المتأخرة</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">المعاملات التي تجاوزت المدة المحددة — {overdue} معاملة</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-right text-sm">
                  <thead>
                    <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                      <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">رقم المعاملة</th>
                      <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">المواطن</th>
                      <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">نوع المعاملة</th>
                      <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">مكتب الارتباط</th>
                      <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">تاريخ التقديم</th>
                      <th className="px-3 py-2 font-medium text-[#5a5a5a]">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions
                      .filter((t) => t.status === "OVERDUE")
                      .slice(0, 20)
                      .map((t) => (
                        <tr key={t.id} className="border-b border-[#d4cfc8]/80">
                          <td className="border-l border-[#d4cfc8]/60 px-3 py-2 font-mono text-[#7C3AED]">{t.serialNumber || "—"}</td>
                          <td className="border-l border-[#d4cfc8]/60 px-3 py-2 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                          <td className="border-l border-[#d4cfc8]/60 px-3 py-2 text-[#5a5a5a]">{t.transactionType || t.type || "—"}</td>
                          <td className="border-l border-[#d4cfc8]/60 px-3 py-2 text-[#5a5a5a]">{t.officeName || "غير محدد"}</td>
                          <td className="border-l border-[#d4cfc8]/60 px-3 py-2 text-[#5a5a5a]">{formatDateShort(t.submissionDate || t.createdAt)}</td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/sorting/transactions?statusFilter=OVERDUE&office=${encodeURIComponent(
                                t.officeName?.trim() || "غير محدد"
                              )}&search=${encodeURIComponent(t.serialNumber || "")}`}
                              className="text-[#7C3AED] underline hover:no-underline"
                            >
                              عرض
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {overdue > 20 && (
                  <p className="border-t border-[#d4cfc8] bg-[#f6f3ed]/30 px-6 py-3 text-center text-sm text-[#5a5a5a]">
                    عرض أول 20 معاملة ضمن الفلتر الحالي — إجمالي المتأخرة: {overdue}
                  </p>
                )}
              </div>
            </article>
          )}

          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <div>
                <h2 className="text-base font-semibold text-[#1B1B1B]">جدول المعاملات التفصيلي</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">عينة من المعاملات ضمن النطاق الحالي — التصدير الكامل متاح عبر زر إكسل أعلاه</p>
              </div>
              <Link
                href={officeFilter ? `/sorting/transactions?office=${encodeURIComponent(officeFilter)}` : "/sorting/transactions"}
                className="rounded-lg border border-[#7C3AED]/50 bg-[#7C3AED]/10 px-3 py-2 text-sm font-medium text-[#7C3AED] transition hover:bg-[#7C3AED]/20"
              >
                عرض جميع المعاملات
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-right text-sm">
                <thead>
                  <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                    <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">رقم</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">المواطن</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">النوع</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">مكتب الارتباط</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">الحالة</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">مسار العمل</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-2 font-medium text-[#5a5a5a]">تاريخ التقديم</th>
                    <th className="px-3 py-2 font-medium text-[#5a5a5a]">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.slice(0, 15).map((t) => (
                    <tr key={t.id} className="border-b border-[#d4cfc8]/80">
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-2 font-mono text-[#7C3AED]">{t.serialNumber || "—"}</td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-2 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                      <td className="max-w-[120px] truncate border-l border-[#d4cfc8]/60 px-3 py-2 text-[#5a5a5a]" title={t.transactionType || t.type || ""}>
                        {t.transactionType || t.type || "—"}
                      </td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-2 text-[#5a5a5a]">{t.officeName || "غير محدد"}</td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-2">
                        <span className="rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-xs font-medium text-[#7C3AED]">
                          {getStatusLabel(t)}
                        </span>
                      </td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-2 text-[#5a5a5a]">{WORKFLOW_LABELS[getWorkflowStatus(t)] ?? "—"}</td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-2 text-[#5a5a5a]">{formatDateShort(t.submissionDate || t.createdAt)}</td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/sorting/transactions?office=${encodeURIComponent(
                            t.officeName?.trim() || "غير محدد"
                          )}&search=${encodeURIComponent(t.serialNumber || "")}`}
                          className="text-[#7C3AED] underline hover:no-underline"
                        >
                          عرض
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTransactions.length > 15 && (
                <p className="border-t border-[#d4cfc8] bg-[#f6f3ed]/30 px-6 py-3 text-center text-sm text-[#5a5a5a]">
                  عرض أول 15 معاملة ضمن النطاق الحالي — استخدم «تصدير إكسل» للحصول على الكل
                </p>
              )}
            </div>
          </article>
        </>
      )}
    </div>
  );
}
