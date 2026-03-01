"use client";

import { useState, useCallback, useEffect } from "react";
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
  cannotCompleteReason?: string | null;
  urgent?: boolean;
  cannotComplete?: boolean;
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

function formatDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
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

function getStatusText(t: Transaction | FullTransaction): string {
  if (t.completedByAdmin || t.status === "DONE") return "منجزة";
  if (t.cannotComplete) return "تعذر إنجازها";
  if (t.delegateName) return `محوّلة للمخول: ${t.delegateName}`;
  if (t.urgent) return "عاجل";
  if (t.status === "OVERDUE") return "متأخرة";
  return "قيد التنفيذ";
}

function getWorkflowSteps(t: Transaction | FullTransaction): { label: string; detail?: string }[] {
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

function buildOfficialReportHtml(items: (Transaction | FullTransaction)[]): string {
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
    <p class="sub">المعاملات تعذر إنجازها — قسم التنسيق والمتابعة</p>
    <p class="sub">تاريخ الطباعة: ${printDate}</p>
  </div>
  ${itemsHtml}
  <div class="footer">— نهاية التقرير —</div>
</body>
</html>`;
}

export default function CoordinatorCannotCompletePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const selectAll = useCallback(() => setSelectedIds(new Set(transactions.map((t) => t.id))), [transactions]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

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
      const res = await fetch("/api/transactions?limit=200&cannotComplete=true", { credentials: "include" });
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] pb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1B1B1B]">المعاملات تعذر انجازها</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            المعاملات التي تعذر إنجازها من قسم الفرز — تُحدَّث تلقائياً كل {POLL_INTERVAL_MS / 1000} ثوانٍ
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
          <p className="text-[#5a5a5a]">لا توجد معاملات تعذر انجازها حالياً.</p>
        </div>
      ) : (
        <>
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">ملخص</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">عدد المعاملات التي تعذر إنجازها الحالية</p>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
                  <span className="text-2xl font-bold text-slate-700">{transactions.length}</span>
                </div>
                <div>
                  <p className="font-semibold text-[#1B1B1B]">{transactions.length} معاملة تعذر إنجازها</p>
                  <p className="text-sm text-[#5a5a5a]">تحتاج متابعة</p>
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
              className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${selectedIds.has(t.id) ? "border-[#5B7C99] ring-2 ring-[#5B7C99]/30" : "border-[#d4cfc8]"}`}
            >
              <div className="border-b border-[#d4cfc8] bg-slate-50/80 px-4 py-3">
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
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      t.status === "DONE"
                        ? "bg-[#ccfbf1] text-[#0f766e]"
                        : t.status === "OVERDUE"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {STATUS_LABELS[t.status] || t.status}
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
                {t.cannotCompleteReason && (
                  <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 line-clamp-2">
                    <span className="font-medium">سبب عدم الإنجاز: </span>
                    {t.cannotCompleteReason}
                  </p>
                )}
                <p className="mt-1 text-xs text-[#5a5a5a]">{formatDate(t.createdAt)}</p>

                <div className="mt-4">
                  <TransactionWorkflowChain transaction={t} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d4cfc8] pt-4">
                  <button
                    type="button"
                    onClick={() => handlePrintReport([t])}
                    className="flex items-center gap-1.5 rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-3 py-2 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4-1v8m0 0V5a2 2 0 012-2h6a2 2 0 012 2v8" />
                    </svg>
                    طباعة تقرير
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
            {viewTransaction.cannotCompleteReason && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">سبب عدم الإنجاز:</p>
                <p className="mt-1 text-sm text-slate-600">{viewTransaction.cannotCompleteReason}</p>
              </div>
            )}
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
