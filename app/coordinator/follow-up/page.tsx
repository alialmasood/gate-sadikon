"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";
import { TransactionWorkflowChain } from "@/components/TransactionWorkflowChain";

type DelegateActionItem = {
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
};

type TxItem = {
  id: string;
  citizenName: string | null;
  citizenPhone: string | null;
  citizenAddress: string | null;
  citizenMinistry?: string | null;
  citizenDepartment?: string | null;
  citizenOrganization?: string | null;
  transactionType: string | null;
  type: string | null;
  serialNumber: string | null;
  formationName?: string | null;
  subDeptName?: string | null;
  officeName?: string | null;
  submissionDate: string | null;
  createdAt: string;
  completedAt: string | null;
  delegateName: string | null;
  completedByAdmin?: boolean;
  followUpUrl?: string | null;
  urgent?: boolean;
  cannotComplete?: boolean;
  cannotCompleteReason?: string | null;
  reachedSorting?: boolean;
  updatedAt?: string | null;
  status?: string;
  delegateActions?: DelegateActionItem[];
};

function daysBetween(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

function formatDuration(days: number): string {
  if (days <= 0) return "أقل من يوم";
  if (days === 1) return "يوم واحد";
  if (days <= 10) return `${days} أيام`;
  if (days < 30) return `حوالي ${Math.round(days / 7)} أسبوع`;
  return `حوالي ${Math.round(days / 30)} شهر`;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "short", numberingSystem: "arab" }).format(new Date(s));
  } catch {
    return s;
  }
}

function formatDateTime(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "short", timeStyle: "short", numberingSystem: "arab" }).format(new Date(s));
  } catch {
    return s;
  }
}

function formatDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getStatusText(t: TxItem): string {
  if (t.completedByAdmin || t.status === "DONE") return "منجزة";
  if (t.cannotComplete) return "تعذر إنجازها";
  if (t.delegateName) return `محوّلة: ${t.delegateName}`;
  if (t.urgent) return "عاجل";
  if (t.status === "OVERDUE") return "متأخرة";
  if (t.reachedSorting) return "قسم الفرز";
  return "قيد التنفيذ";
}

function getStatusBadgeClass(t: TxItem): string {
  if (t.completedByAdmin || t.status === "DONE") return "bg-[#1E6B3A]/15 text-[#1E6B3A]";
  if (t.cannotComplete) return "bg-slate-200 text-slate-700";
  if (t.delegateName) return "bg-amber-100 text-amber-800";
  if (t.urgent) return "bg-red-100 text-red-700";
  if (t.status === "OVERDUE") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function getWorkflowSteps(t: TxItem): { label: string; detail?: string }[] {
  const steps: { label: string; detail?: string }[] = [];
  steps.push({ label: "الاستقبال — تسجيل المعاملة", detail: t.createdAt ? formatDateTime(t.createdAt) : undefined });
  if (t.reachedSorting) steps.push({ label: "قسم الفرز — وصول المعاملة" });
  if (t.urgent) steps.push({ label: "عاجل — إرسال لقسم المتابعة", detail: t.updatedAt ? formatDateTime(t.updatedAt) : undefined });
  if (t.delegateName) steps.push({ label: `محوّلة للمخول — ${t.delegateName}`, detail: t.updatedAt ? formatDateTime(t.updatedAt) : undefined });
  if (t.cannotComplete) steps.push({ label: "تعذر إنجازها", detail: t.cannotCompleteReason || undefined });
  if (t.status === "OVERDUE") steps.push({ label: "متأخرة — تجاوزت المدة المحددة" });
  if (t.completedByAdmin || t.status === "DONE") steps.push({ label: "منجزة", detail: t.completedAt ? formatDateTime(t.completedAt) : undefined });
  if (steps.length <= 1 && t.reachedSorting) steps.push({ label: "قسم الفرز — بانتظار الإجراء" });
  return steps;
}

function buildOfficialReportHtml(items: TxItem[]): string {
  const printDate = formatDateTime(new Date().toISOString());
  const itemsHtml = items.map((t) => {
    const steps = getWorkflowSteps(t);
    const statusText = getStatusText(t);
    const completedBy = t.completedByAdmin ? "مدير المكتب" : t.delegateName ? `${t.delegateName} (المخول)` : "—";
    const duration = (t.completedByAdmin || t.status === "DONE") && t.completedAt
      ? formatDuration(daysBetween(t.submissionDate || t.createdAt, t.completedAt))
      : "";
    const stepsRows = steps.map((s) =>
      `<tr><td style="padding:8px 12px;border:1px solid #ccc">${s.label}</td><td style="padding:8px 12px;border:1px solid #ccc">${s.detail || "—"}</td></tr>`
    ).join("");
    return `
    <div class="report-page" style="page-break-after:always">
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:8px 12px;border:1px solid #333;background:#f5f5f5;width:35%">رقم المعاملة</td><td style="padding:8px 12px;border:1px solid #333">${t.serialNumber ? `2026-${t.serialNumber}` : "—"}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">اسم المواطن</td><td style="padding:8px 12px;border:1px solid #ccc">${t.citizenName || "—"}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">نوع المعاملة</td><td style="padding:8px 12px;border:1px solid #ccc">${t.transactionType || t.type || "—"}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">تاريخ الإنشاء</td><td style="padding:8px 12px;border:1px solid #ccc">${formatDate(t.createdAt)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">الحالة الحالية</td><td style="padding:8px 12px;border:1px solid #ccc;font-weight:bold">${statusText}</td></tr>
        ${(t.completedByAdmin || t.status === "DONE") && t.completedAt ? `
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">تاريخ الإنجاز</td><td style="padding:8px 12px;border:1px solid #ccc">${formatDate(t.completedAt)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">من أنجز</td><td style="padding:8px 12px;border:1px solid #ccc">${completedBy}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">مدة الإنجاز</td><td style="padding:8px 12px;border:1px solid #ccc">${duration}</td></tr>` : ""}
        ${t.cannotComplete && t.cannotCompleteReason ? `
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">سبب عدم الإنجاز</td><td style="padding:8px 12px;border:1px solid #ccc">${t.cannotCompleteReason}</td></tr>` : ""}
      </table>
      <h4 style="margin:12px 0 8px;font-size:14px;border-bottom:2px solid #333;padding-bottom:4px">مسيرة المعاملة</h4>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="padding:8px 12px;border:1px solid #333;background:#e8e8e8;text-align:right">المرحلة</th><th style="padding:8px 12px;border:1px solid #333;background:#e8e8e8;text-align:right">التاريخ/التفاصيل</th></tr></thead>
        <tbody>${stepsRows}</tbody>
      </table>
    </div>`;
  }).join("");
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>تقرير متابعة المعاملات</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Traditional Arabic', 'Arial', sans-serif; font-size: 13px; line-height: 1.6; margin: 0; padding: 20px; color: #1a1a1a; }
  .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 18px; margin: 0 0 4px; }
  .header .sub { font-size: 12px; color: #555; }
  .footer { text-align: center; font-size: 11px; color: #666; margin-top: 24px; padding-top: 8px; border-top: 1px solid #ccc; }
  .report-page:last-child { page-break-after: auto; }
  @media print { body { padding: 0; } .report-page { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <h1>تقرير رسمي — متابعة المعاملات</h1>
    <p class="sub">قسم التنسيق والمتابعة</p>
    <p class="sub">تاريخ الطباعة: ${printDate}</p>
  </div>
  ${itemsHtml}
  <div class="footer">— نهاية التقرير —</div>
</body>
</html>`;
}

const POLL_INTERVAL_MS = 5000;

export default function CoordinatorFollowUpPage() {
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTx, setViewTx] = useState<TxItem | null>(null);
  const [workflowTx, setWorkflowTx] = useState<TxItem | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "day" | "week" | "month" | "custom">("all");
  const [customDateFrom, setCustomDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDateForInput(d);
  });
  const [customDateTo, setCustomDateTo] = useState(() => formatDateForInput(new Date()));

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (periodFilter === "day") {
        const today = formatDateForInput(new Date());
        params.set("dateFrom", today);
        params.set("dateTo", today);
      } else if (periodFilter === "week") {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        params.set("dateFrom", formatDateForInput(start));
        params.set("dateTo", formatDateForInput(end));
      } else if (periodFilter === "month") {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        params.set("dateFrom", formatDateForInput(start));
        params.set("dateTo", formatDateForInput(end));
      } else if (periodFilter === "custom") {
        params.set("dateFrom", customDateFrom);
        params.set("dateTo", customDateTo);
      }
      const res = await fetch(`/api/transactions?${params}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTransactions(data.transactions || []);
        setLastUpdate(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [periodFilter, customDateFrom, customDateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const id = setInterval(loadData, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadData]);

  const handleView = useCallback(async (t: TxItem) => {
    try {
      const res = await fetch(`/api/admin/transactions/${t.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setViewTx(data);
      } else {
        setViewTx(t);
      }
    } catch {
      setViewTx(t);
    }
  }, []);

  const handlePrintReport = useCallback((t: TxItem) => {
    const html = buildOfficialReportHtml([t]);
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close(); }, 300); }
  }, []);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((t) => {
      const serial = (t.serialNumber || "").toLowerCase();
      const name = (t.citizenName || "").toLowerCase();
      const phone = (t.citizenPhone || "").replace(/\s/g, "");
      const type = (t.transactionType || t.type || "").toLowerCase();
      return serial.includes(q) || name.includes(q) || phone.includes(q) || type.includes(q);
    });
  }, [transactions, searchQuery]);

  const stats = useMemo(() => ({
    total: filteredTransactions.length,
    done: filteredTransactions.filter((t) => t.completedByAdmin || t.status === "DONE").length,
    urgent: filteredTransactions.filter((t) => t.urgent).length,
    delegated: filteredTransactions.filter((t) => t.delegateName).length,
    cannotComplete: filteredTransactions.filter((t) => t.cannotComplete).length,
    pending: filteredTransactions.filter((t) => !t.urgent && !t.delegateName && !t.cannotComplete && t.status !== "DONE").length,
  }), [filteredTransactions]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B1B1B]">متابعة المعاملات</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            جميع المعاملات — تُحدَّث تلقائياً كل {POLL_INTERVAL_MS / 1000} ثوانٍ
            {lastUpdate && <span className="mr-2 text-xs text-[#5B7C99]">(آخر تحديث: {formatDate(lastUpdate.toISOString())})</span>}
          </p>
        </div>
        <Link href="/coordinator" className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] transition-colors hover:bg-[#f6f3ed]">
          لوحة التحكم
        </Link>
      </div>

      <article className="overflow-hidden rounded-2xl border-2 border-[#333] bg-white shadow-sm">
        <div className="border-b-2 border-[#333] bg-[#f5f5f5] px-6 py-4">
          <h2 className="text-base font-bold text-[#1B1B1B]">شريط البحث والفلترة</h2>
          <p className="mt-0.5 text-sm text-[#5a5a5a]">بحث وفلترة المعاملات حسب الفترة الزمنية</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1B1B1B]">البحث</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="رقم المعاملة، اسم المواطن، الهاتف، نوع المعاملة"
                className="w-full rounded-lg border-2 border-[#333] bg-white px-4 py-2.5 text-sm placeholder:text-[#999] focus:border-[#5B7C99] focus:outline-none focus:ring-1 focus:ring-[#5B7C99]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1B1B1B]">الفترة الزمنية</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as typeof periodFilter)}
                className="w-full rounded-lg border-2 border-[#333] bg-white px-4 py-2.5 text-sm focus:border-[#5B7C99] focus:outline-none focus:ring-1 focus:ring-[#5B7C99]"
              >
                <option value="all">جميع الفترات</option>
                <option value="day">اليوم</option>
                <option value="week">آخر 7 أيام</option>
                <option value="month">آخر 30 يوم</option>
                <option value="custom">مخصص</option>
              </select>
            </div>
            {periodFilter === "custom" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1B1B1B]">من تاريخ</label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="w-full rounded-lg border-2 border-[#333] bg-white px-4 py-2.5 text-sm focus:border-[#5B7C99] focus:outline-none focus:ring-1 focus:ring-[#5B7C99]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#1B1B1B]">إلى تاريخ</label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="w-full rounded-lg border-2 border-[#333] bg-white px-4 py-2.5 text-sm focus:border-[#5B7C99] focus:outline-none focus:ring-1 focus:ring-[#5B7C99]"
                  />
                </div>
              </>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadData()}
              className="rounded-lg border-2 border-[#333] bg-[#333] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1B1B1B]"
            >
              تطبيق الفلتر
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setPeriodFilter("all");
              }}
              className="rounded-lg border-2 border-[#999] bg-white px-5 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-[#f5f5f5]"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </article>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5B7C99] border-t-transparent" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-[#d4cfc8] bg-white p-12 text-center shadow-sm">
          <p className="text-[#5a5a5a]">لا توجد معاملات حالياً.</p>
        </div>
      ) : (
        <>
          <article className="overflow-hidden rounded-2xl border-2 border-[#333] bg-white shadow-sm">
            <div className="border-b-2 border-[#333] bg-[#f5f5f5] px-6 py-4">
              <h2 className="text-base font-bold text-[#1B1B1B]">ملخص المعاملات</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">توزيع المعاملات حسب الحالة</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-lg border border-[#333] bg-white px-4 py-3">
                  <p className="text-xs font-medium text-[#5a5a5a]">الإجمالي</p>
                  <p className="mt-1 text-xl font-bold text-[#1B1B1B]">{stats.total}</p>
                </div>
                <div className="rounded-lg border border-[#1E6B3A] bg-[#1E6B3A]/5 px-4 py-3">
                  <p className="text-xs font-medium text-[#1E6B3A]">منجزة</p>
                  <p className="mt-1 text-xl font-bold text-[#1E6B3A]">{stats.done}</p>
                </div>
                <div className="rounded-lg border border-red-500 bg-red-50 px-4 py-3">
                  <p className="text-xs font-medium text-red-700">عاجل</p>
                  <p className="mt-1 text-xl font-bold text-red-700">{stats.urgent}</p>
                </div>
                <div className="rounded-lg border border-amber-500 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-medium text-amber-800">محوّلة لمخول</p>
                  <p className="mt-1 text-xl font-bold text-amber-800">{stats.delegated}</p>
                </div>
                <div className="rounded-lg border border-slate-500 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-700">تعذر إنجازها</p>
                  <p className="mt-1 text-xl font-bold text-slate-700">{stats.cannotComplete}</p>
                </div>
                <div className="rounded-lg border border-[#5B7C99] bg-[#5B7C99]/10 px-4 py-3">
                  <p className="text-xs font-medium text-[#5B7C99]">قيد التنفيذ</p>
                  <p className="mt-1 text-xl font-bold text-[#5B7C99]">{stats.pending}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredTransactions.length === 0 && transactions.length > 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-[#5a5a5a]">لا توجد نتائج مطابقة للبحث أو الفلترة.</p>
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setPeriodFilter("all"); loadData(); }}
                    className="mt-3 rounded-lg border-2 border-[#5B7C99] bg-[#5B7C99]/10 px-4 py-2 text-sm font-medium text-[#5B7C99] hover:bg-[#5B7C99]/20"
                  >
                    مسح البحث والفلتر
                  </button>
                </div>
              ) : (
              <table className="w-full min-w-[900px] border-collapse text-right text-sm">
                <thead>
                  <tr className="border-b-2 border-[#333] bg-[#e8e8e8]">
                    <th className="border-l border-[#999] px-4 py-3 font-bold text-[#1B1B1B]">م</th>
                    <th className="border-l border-[#999] px-4 py-3 font-bold text-[#1B1B1B]">رقم المعاملة</th>
                    <th className="border-l border-[#999] px-4 py-3 font-bold text-[#1B1B1B]">اسم المواطن</th>
                    <th className="border-l border-[#999] px-4 py-3 font-bold text-[#1B1B1B]">الهاتف</th>
                    <th className="border-l border-[#999] px-4 py-3 font-bold text-[#1B1B1B]">نوع المعاملة</th>
                    <th className="border-l border-[#999] px-4 py-3 font-bold text-[#1B1B1B]">تاريخ الإنشاء</th>
                    <th className="border-l border-[#999] px-4 py-3 text-center font-bold text-[#1B1B1B]">الحالة</th>
                    <th className="border-l border-[#999] px-4 py-3 font-bold text-[#1B1B1B]">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t, idx) => (
                    <tr key={t.id} className="border-b border-[#d4cfc8] hover:bg-[#f9f9f9]">
                      <td className="border-l border-[#d4cfc8] px-4 py-3 text-[#5a5a5a]">{idx + 1}</td>
                      <td className="border-l border-[#d4cfc8] px-4 py-3 font-mono font-medium text-[#1B1B1B]">
                        {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                      </td>
                      <td className="border-l border-[#d4cfc8] px-4 py-3 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                      <td className="border-l border-[#d4cfc8] px-4 py-3 text-[#1B1B1B]" dir="ltr">{t.citizenPhone || "—"}</td>
                      <td className="border-l border-[#d4cfc8] px-4 py-3 text-[#1B1B1B]">{t.transactionType || t.type || "—"}</td>
                      <td className="border-l border-[#d4cfc8] px-4 py-3 text-[#5a5a5a]">{formatDate(t.createdAt)}</td>
                      <td className="border-l border-[#d4cfc8] px-4 py-3 align-middle">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(t)}`}>
                            {getStatusText(t)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setWorkflowTx(t)}
                            title="عرض سلسلة حياة المعاملة"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#5B7C99]/50 bg-[#5B7C99]/10 text-[#5B7C99] hover:bg-[#5B7C99]/20"
                            aria-label="عرض سلسلة حياة المعاملة"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="border-l border-[#d4cfc8] px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleView(t)}
                            className="rounded-lg border border-[#5B7C99]/50 bg-[#5B7C99]/10 px-2.5 py-1.5 text-xs font-medium text-[#5B7C99] hover:bg-[#5B7C99]/20"
                          >
                            عرض
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintReport(t)}
                            className="rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-2.5 py-1.5 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                          >
                            طباعة تقرير
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          </article>
        </>
      )}

      {workflowTx && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50" onClick={() => setWorkflowTx(null)} aria-hidden />
          <div className="relative mx-auto mt-8 mb-16 max-w-lg rounded-2xl border-2 border-[#333] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-[#d4cfc8] pb-4">
              <h3 className="text-lg font-bold text-[#1B1B1B]">سلسلة حياة المعاملة</h3>
              <button type="button" onClick={() => setWorkflowTx(null)} className="rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200" aria-label="إغلاق">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-3 text-sm text-[#5a5a5a]">
              {workflowTx.serialNumber ? `2026-${workflowTx.serialNumber}` : "—"} — {workflowTx.citizenName || "—"}
            </p>
            <TransactionWorkflowChain transaction={workflowTx} />
          </div>
        </div>
      )}

      {viewTx && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewTx(null)} aria-hidden />
          <div className="relative mx-auto mt-8 mb-16 max-w-2xl rounded-2xl border border-[#d4cfc8] bg-[#FAFAF9] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">عرض المعاملة</h3>
              <button type="button" onClick={() => setViewTx(null)} className="rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200" aria-label="إغلاق">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {viewTx.delegateActions && viewTx.delegateActions.length > 0 && (
              <div className="mb-6 rounded-xl border border-[#5B7C99]/20 bg-[#5B7C99]/5 p-4">
                <h3 className="mb-3 text-sm font-bold text-[#5B7C99]">تحديثات المخول</h3>
                <ul className="space-y-2">
                  {viewTx.delegateActions.map((a, i) => (
                    <li key={i} className="rounded-lg border border-[#d4cfc8] bg-white p-3">
                      <p className="text-xs text-[#5a5a5a]">{formatDateTime(a.createdAt)}</p>
                      <p className="mt-1 text-sm text-[#1B1B1B]">{a.text}</p>
                      {a.attachmentUrl && (
                        <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[#0D9488]">
                          {a.attachmentName || "عرض المرفق"}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <TransactionReceipt
              receipt={
                {
                  citizenName: viewTx.citizenName,
                  citizenPhone: viewTx.citizenPhone,
                  citizenAddress: viewTx.citizenAddress,
                  citizenMinistry: viewTx.citizenMinistry ?? null,
                  citizenDepartment: viewTx.citizenDepartment ?? null,
                  citizenOrganization: viewTx.citizenOrganization ?? null,
                  transactionType: viewTx.transactionType || viewTx.type,
                  formationName: viewTx.formationName ?? null,
                  subDeptName: viewTx.subDeptName ?? null,
                  officeName: viewTx.officeName ?? null,
                  serialNumber: viewTx.serialNumber,
                  followUpUrl: viewTx.followUpUrl ?? null,
                  submissionDate: viewTx.submissionDate,
                  createdAt: viewTx.createdAt ?? viewTx.submissionDate,
                } as ReceiptData
              }
              mode="modal"
              onClose={() => setViewTx(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
