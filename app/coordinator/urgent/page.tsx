"use client";

import { useState, useCallback, useEffect } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import Link from "next/link";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";
import { TransactionWorkflowChain } from "@/components/TransactionWorkflowChain";

type Transaction = {
  id: string;
  citizenName: string | null;
  citizenPhone: string | null;
  citizenAddress: string | null;
  status: string;
  type: string | null;
  transactionType: string | null;
  serialNumber: string | null;
  submissionDate: string | null;
  createdAt: string;
  completedAt: string | null;
  delegateName: string | null;
  urgent?: boolean;
  cannotComplete?: boolean;
  cannotCompleteReason?: string | null;
  reachedSorting?: boolean;
  completedByAdmin?: boolean;
  updatedAt?: string | null;
};

type FullTransaction = Transaction & {
  citizenMinistry?: string | null;
  citizenDepartment?: string | null;
  citizenOrganization?: string | null;
  transactionTitle?: string | null;
  officeName?: string | null;
  formationName?: string | null;
  subDeptName?: string | null;
  followUpUrl?: string | null;
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

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
};

const POLL_INTERVAL_MS = 3000;

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

function formatDateTime(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      dateStyle: "short",
      timeStyle: "short",
      numberingSystem: "arab",
    }).format(new Date(s));
  } catch {
    return s;
  }
}

function getWorkflowSteps(t: Transaction | FullTransaction): { label: string; detail?: string }[] {
  const steps: { label: string; detail?: string }[] = [];
  steps.push({
    label: "الاستقبال — تسجيل المعاملة",
    detail: t.createdAt ? formatDateTime(t.createdAt) : undefined,
  });
  if (t.reachedSorting) {
    steps.push({ label: "قسم الفرز — وصول المعاملة" });
  }
  if (t.urgent) {
    steps.push({
      label: "عاجل — إرسال لقسم المتابعة (التنسيق)",
      detail: t.updatedAt ? formatDateTime(t.updatedAt) : undefined,
    });
  }
  if (t.delegateName) {
    steps.push({
      label: `محوّلة للمخول — ${t.delegateName}`,
      detail: t.updatedAt ? formatDateTime(t.updatedAt) : undefined,
    });
  }
  if (t.cannotComplete) {
    steps.push({
      label: "تعذر إنجازها",
      detail: t.cannotCompleteReason || undefined,
    });
  }
  if (t.status === "OVERDUE") {
    steps.push({ label: "متأخرة — تجاوزت المدة المحددة" });
  }
  if (t.completedByAdmin || t.status === "DONE") {
    steps.push({
      label: "منجزة",
      detail: t.completedAt ? formatDateTime(t.completedAt) : undefined,
    });
  }
  if (steps.length <= 1 && t.reachedSorting) {
    steps.push({ label: "قسم الفرز — بانتظار الإجراء" });
  }
  return steps;
}

function getStatusText(t: Transaction | FullTransaction): string {
  if (t.completedByAdmin || t.status === "DONE") return "منجزة";
  if (t.cannotComplete) return "تعذر إنجازها";
  if (t.delegateName) return `محوّلة للمخول: ${t.delegateName}`;
  if (t.urgent) return "عاجل";
  if (t.status === "OVERDUE") return "متأخرة";
  return "قيد التنفيذ";
}

function getStatusLocation(t: Transaction | FullTransaction): string {
  if (t.completedByAdmin || t.status === "DONE") return "منجزة — أُنجزت";
  if (t.cannotComplete) return "تعذر إنجازها";
  if (t.delegateName) return `لدى المخول: ${t.delegateName}`;
  if (t.urgent) return "قسم المتابعة (عاجل)";
  if (t.status === "OVERDUE") return "متأخرة";
  if (t.reachedSorting) return "قسم الفرز";
  return "الاستقبال";
}

function getStatusDateTime(t: Transaction | FullTransaction): string | null {
  if (t.completedByAdmin || t.status === "DONE") return t.completedAt;
  return t.updatedAt || t.createdAt;
}

function formatDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildOfficialReportHtml(items: (Transaction | FullTransaction)[]): string {
  const printDate = formatDateTime(new Date().toISOString());
  const itemsHtml = items.map((t) => {
    const steps = getWorkflowSteps(t);
    const statusText = getStatusText(t);
    const completedBy = t.completedByAdmin ? "مدير المكتب" : t.delegateName ? `${t.delegateName} (المخول)` : "—";
    const duration = (t.completedByAdmin || t.status === "DONE") && t.completedAt
      ? formatDuration(daysBetween(t.submissionDate || t.createdAt, t.completedAt))
      : "";

    const stepsRows = steps.map((s) => `
      <tr><td style="padding:8px 12px;border:1px solid #ccc">${s.label}</td>
      <td style="padding:8px 12px;border:1px solid #ccc">${s.detail || "—"}</td></tr>`).join("");

    return `
    <div class="report-page" style="page-break-after:always">
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:8px 12px;border:1px solid #333;background:#f5f5f5;width:35%">رقم المعاملة</td>
        <td style="padding:8px 12px;border:1px solid #333">${t.serialNumber ? `2026-${t.serialNumber}` : "—"}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">اسم المواطن</td>
        <td style="padding:8px 12px;border:1px solid #ccc">${t.citizenName || "—"}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">نوع المعاملة</td>
        <td style="padding:8px 12px;border:1px solid #ccc">${t.transactionType || t.type || "—"}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">تاريخ الإنشاء</td>
        <td style="padding:8px 12px;border:1px solid #ccc">${formatDate(t.createdAt)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">الحالة الحالية</td>
        <td style="padding:8px 12px;border:1px solid #ccc;font-weight:bold">${statusText}</td></tr>
        ${(t.completedByAdmin || t.status === "DONE") && t.completedAt ? `
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">تاريخ الإنجاز</td>
        <td style="padding:8px 12px;border:1px solid #ccc">${formatDate(t.completedAt)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">من أنجز</td>
        <td style="padding:8px 12px;border:1px solid #ccc">${completedBy}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">مدة الإنجاز</td>
        <td style="padding:8px 12px;border:1px solid #ccc">${duration}</td></tr>` : ""}
        ${t.cannotComplete && t.cannotCompleteReason ? `
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">سبب عدم الإنجاز</td>
        <td style="padding:8px 12px;border:1px solid #ccc">${t.cannotCompleteReason}</td></tr>` : ""}
      </table>
      <h4 style="margin:12px 0 8px;font-size:14px;border-bottom:2px solid #333;padding-bottom:4px">مسيرة المعاملة</h4>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="padding:8px 12px;border:1px solid #333;background:#e8e8e8;text-align:right">المرحلة</th>
        <th style="padding:8px 12px;border:1px solid #333;background:#e8e8e8;text-align:right">التاريخ/التفاصيل</th></tr></thead>
        <tbody>${stepsRows}</tbody>
      </table>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>تقرير حالة المعاملات ومسيرتها</title>
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
    <h1>تقرير رسمي — حالة المعاملة ومسيرتها</h1>
    <p class="sub">المعاملات العاجلة — قسم التنسيق والمتابعة</p>
    <p class="sub">تاريخ الطباعة: ${printDate}</p>
  </div>
  ${itemsHtml}
  <div class="footer">— نهاية التقرير —</div>
</body>
</html>`;
}

export default function CoordinatorUrgentPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [reportTransaction, setReportTransaction] = useState<FullTransaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [statusReportPeriod, setStatusReportPeriod] = useState<"day" | "week" | "custom">("week");
  const [customDateFrom, setCustomDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return formatDateForInput(d);
  });
  const [customDateTo, setCustomDateTo] = useState(() => formatDateForInput(new Date()));
  const [statusReportList, setStatusReportList] = useState<Transaction[]>([]);
  const [statusReportLoading, setStatusReportLoading] = useState(false);
  const [statusReportFetched, setStatusReportFetched] = useState(false);

  const loadStatusReport = useCallback(async () => {
    setStatusReportLoading(true);
    try {
      const now = new Date();
      let dateFrom: string;
      let dateTo: string;
      if (statusReportPeriod === "day") {
        dateFrom = formatDateForInput(now);
        dateTo = formatDateForInput(now);
      } else if (statusReportPeriod === "week") {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        dateFrom = formatDateForInput(start);
        dateTo = formatDateForInput(now);
      } else {
        dateFrom = customDateFrom;
        dateTo = customDateTo;
      }
      const params = new URLSearchParams({ limit: "500", dateFrom, dateTo });
      const res = await fetch(`/api/transactions?${params}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      setStatusReportList(res.ok ? (data.transactions || []) : []);
      setStatusReportFetched(true);
    } catch {
      setStatusReportList([]);
      setStatusReportFetched(true);
    } finally {
      setStatusReportLoading(false);
    }
  }, [statusReportPeriod, customDateFrom, customDateTo]);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions?limit=200&urgent=true", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTransactions(data.transactions || []);
        setLastUpdate(new Date());
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

  useAutoRefresh(loadData);

  const handleView = useCallback(async (t: Transaction) => {
    try {
      const res = await fetch(`/api/admin/transactions/${t.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setViewTransaction(data);
      } else {
        alert("فشل تحميل تفاصيل المعاملة");
      }
    } catch {
      alert("حدث خطأ غير متوقع");
    }
  }, []);

  const handleReport = useCallback(async (t: Transaction) => {
    try {
      const res = await fetch(`/api/admin/transactions/${t.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setReportTransaction(data);
      } else {
        alert("فشل تحميل تفاصيل المعاملة");
      }
    } catch {
      alert("حدث خطأ غير متوقع");
    }
  }, []);

  const handlePrintReceipt = useCallback(async (t: Transaction) => {
    try {
      const res = await fetch(`/api/admin/transactions/${t.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setViewTransaction(data);
        setTimeout(() => {
          const content = document.getElementById("receipt-content");
          if (content) {
            const printWindow = window.open("", "_blank");
            if (printWindow) {
              printWindow.document.write(`
                <!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>وصل المعاملة</title>
                <style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial;font-size:13px;padding:16px;line-height:1.5}
                .receipt-wrap h3{font-size:15px;margin:12px 0 8px;padding-bottom:8px;border-bottom:2px solid #ddd}
                table{width:100%;border-collapse:collapse}td{padding:10px 12px;border-bottom:1px solid #eee}
                .receipt-wrap svg{width:140px!important;height:140px!important}</style></head>
                <body><div class="receipt-wrap">${content.innerHTML}</div></body></html>`);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
            }
          }
        }, 400);
      }
    } catch {
      alert("فشل تحميل بيانات الطباعة");
    }
  }, []);

  const handlePrintReport = useCallback((items: (Transaction | FullTransaction)[]) => {
    if (items.length === 0) {
      alert("لم يتم تحديد أي معاملات للطباعة");
      return;
    }
    const html = buildOfficialReportHtml(items);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("الرجاء السماح بالنوافذ المنبثقة للطباعة");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(transactions.map((t) => t.id)));
  }, [transactions]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] pb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1B1B1B]">المعاملات العاجلة</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            المعاملات ذات الأولوية العالية — تُحدَّث تلقائياً كل {POLL_INTERVAL_MS / 1000} ثوانٍ
            {lastUpdate && (
              <span className="mr-2 text-xs text-[#5B7C99]">(آخر تحديث: {formatDate(lastUpdate.toISOString())})</span>
            )}
          </p>
        </div>
        <Link href="/coordinator" className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] transition-colors hover:bg-[#f6f3ed]">
          لوحة التحكم
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5B7C99] border-t-transparent" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-[#d4cfc8] bg-white p-12 text-center shadow-sm">
          <p className="text-[#5a5a5a]">لا توجد معاملات عاجلة حالياً.</p>
        </div>
      ) : (
        <>
          <article className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="border-b border-red-200 bg-red-50/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">ملخص</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">عدد المعاملات العاجلة الحالية</p>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-red-100">
                  <span className="text-2xl font-bold text-red-700">{transactions.length}</span>
                </div>
                <div>
                  <p className="font-semibold text-[#1B1B1B]">{transactions.length} معاملة عاجلة</p>
                  <p className="text-sm text-[#5a5a5a]">تتطلب متابعة فورية</p>
                </div>
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">طباعة تقرير رسمي</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">تقرير حالة المعاملة ومسيرتها — ورق A4</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReport(transactions)}
                  className="rounded-lg border border-[#5B7C99]/50 bg-[#5B7C99]/10 px-4 py-2 text-sm font-medium text-[#5B7C99] hover:bg-[#5B7C99]/20"
                >
                  طباعة الكل
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintReport(transactions.filter((t) => selectedIds.has(t.id)))}
                  className="rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-4 py-2 text-sm font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                >
                  طباعة المحدد ({selectedIds.size})
                </button>
                <button type="button" onClick={selectAll} className="rounded-lg border border-[#d4cfc8] px-4 py-2 text-sm text-[#5a5a5a] hover:bg-[#f6f3ed]">
                  تحديد الكل
                </button>
                <button type="button" onClick={clearSelection} className="rounded-lg border border-[#d4cfc8] px-4 py-2 text-sm text-[#5a5a5a] hover:bg-[#f6f3ed]">
                  إلغاء التحديد
                </button>
              </div>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {transactions.map((t) => (
            <article
              key={t.id}
              className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${selectedIds.has(t.id) ? "border-[#5B7C99] ring-2 ring-[#5B7C99]/30" : "border-red-200"}`}
            >
              <div className="border-b border-red-200 bg-red-50/50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="h-4 w-4 rounded border-[#d4cfc8] text-[#5B7C99] focus:ring-[#5B7C99]"
                    />
                    <span className="font-mono text-sm font-bold text-[#5B7C99]" dir="ltr">
                      {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                    </span>
                  </label>
                  <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    عاجل
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="truncate font-semibold text-[#1B1B1B]">{t.citizenName || "—"}</h3>
                <p className="mt-1 text-sm text-[#5a5a5a]" dir="ltr">
                  {t.citizenPhone || "—"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-[#5a5a5a]">
                  {t.transactionType || t.type || "—"}
                </p>
                <p className="mt-1 text-xs text-[#5a5a5a]">{formatDate(t.createdAt)}</p>

                <div className="mt-4">
                  <TransactionWorkflowChain transaction={t} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d4cfc8] pt-4">
                  <button
                    type="button"
                    onClick={() => handleReport(t)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-3 py-2 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    تقرير
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintReport([t])}
                    className="flex items-center gap-1.5 rounded-lg border border-[#5B7C99]/50 bg-[#5B7C99]/10 px-3 py-2 text-xs font-medium text-[#5B7C99] hover:bg-[#5B7C99]/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4-1v8m0 0V5a2 2 0 012-2h6a2 2 0 012 2v8" />
                    </svg>
                    طباعة تقرير
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(t)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#B08D57]/50 bg-[#B08D57]/10 px-3 py-2 text-xs font-medium text-[#9C7B49] hover:bg-[#B08D57]/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    طباعة وصل
                  </button>
                  <button
                    type="button"
                    onClick={() => handleView(t)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#5B7C99]/50 bg-[#5B7C99]/10 px-3 py-2 text-xs font-medium text-[#5B7C99] hover:bg-[#5B7C99]/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    عرض
                  </button>
                </div>
              </div>
            </article>
          ))}
          </div>
        </>
      )}

      {!loading && (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
            <h2 className="text-base font-semibold text-[#1B1B1B]">تقرير حالة المعاملات</h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">سحب تقرير يوضح أين وصلت كل معاملة وحالتها الأخيرة — حسب الفترة الزمنية</p>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div className="flex flex-wrap gap-2">
                {(["day", "week", "custom"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setStatusReportPeriod(p)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      statusReportPeriod === p ? "bg-[#5B7C99] text-white" : "border border-[#d4cfc8] bg-white text-[#5a5a5a] hover:bg-[#f6f3ed]"
                    }`}
                  >
                    {p === "day" ? "يومي" : p === "week" ? "أسبوعي" : "مخصص"}
                  </button>
                ))}
              </div>
              {statusReportPeriod === "custom" && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-sm">
                    <span className="text-[#5a5a5a]">من</span>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="rounded-lg border border-[#d4cfc8] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <span className="text-[#5a5a5a]">إلى</span>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="rounded-lg border border-[#d4cfc8] px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              )}
              <button
                type="button"
                onClick={loadStatusReport}
                disabled={statusReportLoading}
                className="rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-4 py-2 text-sm font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20 disabled:opacity-50"
              >
                {statusReportLoading ? "جاري السحب…" : "سحب التقرير"}
              </button>
            </div>
          </div>
          {statusReportList.length > 0 && (
            <>
            <div className="flex justify-end border-b border-[#d4cfc8] px-6 py-2">
              <button
                type="button"
                onClick={() => {
                  const periodLabel = statusReportPeriod === "day" ? "يومي" : statusReportPeriod === "week" ? "أسبوعي" : `من ${customDateFrom} إلى ${customDateTo}`;
                  const printDate = formatDateTime(new Date().toISOString());
                  const rows = statusReportList.map((t) => `
                    <tr>
                      <td style="padding:8px 12px;border:1px solid #ccc">${t.serialNumber ? `2026-${t.serialNumber}` : "—"}</td>
                      <td style="padding:8px 12px;border:1px solid #ccc">${t.citizenName || "—"}</td>
                      <td style="padding:8px 12px;border:1px solid #ccc">${t.transactionType || t.type || "—"}</td>
                      <td style="padding:8px 12px;border:1px solid #ccc">${getStatusLocation(t)}</td>
                      <td style="padding:8px 12px;border:1px solid #ccc">${formatDateTime(getStatusDateTime(t))}</td>
                    </tr>`).join("");
                  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير حالة المعاملات</title>
<style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:20px}
.header{text-align:center;border-bottom:3px double #333;padding-bottom:12px;margin-bottom:20px}.header h1{font-size:16px;margin:0 0 4px}
table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;border:1px solid #ccc;text-align:right}th{background:#e8e8e8}
@media print{body{padding:0}}</style></head><body>
<div class="header"><h1>تقرير حالة المعاملات — أين وصلت كل معاملة</h1>
<p style="font-size:11px;color:#555">الفترة: ${periodLabel} — تاريخ الطباعة: ${printDate}</p></div>
<table><thead><tr><th>رقم المعاملة</th><th>المواطن</th><th>نوع المعاملة</th><th>الحالة / أين وصلت</th><th>التاريخ والوقت</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
                  const w = window.open("", "_blank");
                  if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close(); }, 300); }
                }}
                className="rounded-lg border border-[#5B7C99]/50 bg-[#5B7C99]/10 px-4 py-2 text-sm font-medium text-[#5B7C99] hover:bg-[#5B7C99]/20"
              >
                طباعة التقرير
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-right text-sm">
                <thead>
                  <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                    <th className="border-l border-[#d4cfc8] px-3 py-3 font-medium text-[#5a5a5a]">رقم المعاملة</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-3 font-medium text-[#5a5a5a]">المواطن</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-3 font-medium text-[#5a5a5a]">نوع المعاملة</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-3 font-medium text-[#5a5a5a]">الحالة / أين وصلت</th>
                    <th className="px-3 py-3 font-medium text-[#5a5a5a]">التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {statusReportList.map((t) => (
                    <tr key={t.id} className="border-b border-[#d4cfc8]/80 hover:bg-[#f6f3ed]/50">
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-3 font-mono text-[#1B1B1B]">
                        {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                      </td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-3 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-3 text-[#1B1B1B]">{t.transactionType || t.type || "—"}</td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          t.completedByAdmin || t.status === "DONE" ? "bg-[#1E6B3A]/15 text-[#1E6B3A]" :
                          t.cannotComplete ? "bg-slate-200 text-slate-700" :
                          t.delegateName ? "bg-amber-100 text-amber-800" :
                          t.urgent ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {getStatusLocation(t)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[#5a5a5a]">{formatDateTime(getStatusDateTime(t))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          {statusReportList.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-[#5a5a5a]">
              {statusReportFetched ? "لا توجد معاملات في الفترة المحددة" : "اختر الفترة ثم اضغط «سحب التقرير» لعرض المعاملات"}
            </p>
          )}
        </article>
      )}

      {reportTransaction && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50" onClick={() => setReportTransaction(null)} aria-hidden />
          <div className="relative mx-auto mt-8 mb-16 w-full max-w-2xl rounded-2xl border border-[#d4cfc8] bg-[#FAFAF9] shadow-xl">
            <div className="border-b border-[#d4cfc8] bg-[#1E6B3A]/10 px-6 py-4">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">تقرير المعاملة الكامل</h3>
              <p className="mt-1 text-sm text-[#5a5a5a]">
                {reportTransaction.serialNumber ? `2026-${reportTransaction.serialNumber}` : "—"} — {reportTransaction.citizenName || "—"}
              </p>
              <button
                type="button"
                onClick={() => setReportTransaction(null)}
                className="absolute left-4 top-4 rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200"
                aria-label="إغلاق"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-[#d4cfc8] bg-white p-4">
                <h4 className="mb-3 text-sm font-semibold text-[#1B1B1B]">معلومات المعاملة</h4>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-[#5a5a5a]">نوع المعاملة</dt><dd className="font-medium">{reportTransaction.transactionType || reportTransaction.type || "—"}</dd></div>
                  <div><dt className="text-[#5a5a5a]">تاريخ الإنشاء</dt><dd className="font-medium">{formatDate(reportTransaction.createdAt)}</dd></div>
                  <div><dt className="text-[#5a5a5a]">الحالة</dt><dd>
                    {reportTransaction.completedByAdmin || reportTransaction.status === "DONE"
                      ? <span className="rounded-full bg-[#1E6B3A]/15 px-2 py-0.5 text-[#1E6B3A]">منجزة</span>
                      : reportTransaction.cannotComplete
                        ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">تعذر إنجازها</span>
                        : reportTransaction.delegateName
                          ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">محوّلة للمخول: {reportTransaction.delegateName}</span>
                          : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">قيد التنفيذ</span>
                    }
                  </dd></div>
                </dl>
              </div>

              {(reportTransaction.completedByAdmin || reportTransaction.status === "DONE") && (
                <div className="rounded-xl border border-[#1E6B3A]/30 bg-[#1E6B3A]/5 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[#1E6B3A]">تفاصيل الإنجاز</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-[#5a5a5a]">متى أُنجزت</dt>
                      <dd className="font-medium">{formatDate(reportTransaction.completedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#5a5a5a]">من أنجز المعاملة</dt>
                      <dd className="font-medium">
                        {reportTransaction.completedByAdmin ? "مدير المكتب" : reportTransaction.delegateName ? `${reportTransaction.delegateName} (المخول)` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#5a5a5a]">مدة الإنجاز</dt>
                      <dd className="font-medium">
                        {formatDuration(daysBetween(reportTransaction.submissionDate || reportTransaction.createdAt, reportTransaction.completedAt))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#5a5a5a]">ما هو الإنجاز</dt>
                      <dd className="font-medium">إكمال المعاملة — {reportTransaction.transactionType || reportTransaction.type || "—"}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {reportTransaction.cannotComplete && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">سبب عدم الإنجاز</h4>
                  <p className="text-sm">{reportTransaction.cannotCompleteReason || "—"}</p>
                </div>
              )}

              {reportTransaction.delegateName && !(reportTransaction.completedByAdmin || reportTransaction.status === "DONE") && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-amber-800">عند المخول</h4>
                  <p className="text-sm">المعاملة محوّلة إلى المخول: <strong>{reportTransaction.delegateName}</strong></p>
                  <p className="mt-1 text-xs text-[#5a5a5a]">لم تُنجز بعد</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewTransaction && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewTransaction(null)} aria-hidden />
          <div className="relative mx-auto mt-8 mb-16 w-full max-w-2xl rounded-2xl border border-[#d4cfc8] bg-[#FAFAF9] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">عرض وصل المعاملة</h3>
              <button
                type="button"
                onClick={() => setViewTransaction(null)}
                className="rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200"
                aria-label="إغلاق"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TransactionReceipt
              receipt={
                {
                  citizenName: viewTransaction.citizenName,
                  citizenPhone: viewTransaction.citizenPhone,
                  citizenAddress: viewTransaction.citizenAddress,
                  citizenMinistry: viewTransaction.citizenMinistry,
                  citizenDepartment: viewTransaction.citizenDepartment,
                  citizenOrganization: viewTransaction.citizenOrganization,
                  transactionType: viewTransaction.transactionType || viewTransaction.type,
                  formationName: viewTransaction.formationName ?? null,
                  subDeptName: viewTransaction.subDeptName ?? null,
                  officeName: viewTransaction.officeName,
                  serialNumber: viewTransaction.serialNumber,
                  followUpUrl: viewTransaction.followUpUrl ?? null,
                  submissionDate: viewTransaction.submissionDate,
                  createdAt: viewTransaction.createdAt,
                } as ReceiptData
              }
              mode="modal"
              onClose={() => setViewTransaction(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
