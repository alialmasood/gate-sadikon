"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";

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

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", numberingSystem: "arab" }).format(new Date(s));
  } catch {
    return s;
  }
}

function formatDateShort(s: string | null | undefined): string {
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

function getStatusText(t: TxItem): string {
  if (t.completedByAdmin || t.status === "DONE") return "منجزة";
  if (t.cannotComplete) return "تعذر إنجازها";
  if (t.delegateName) return `محوّلة للمخول: ${t.delegateName}`;
  if (t.urgent) return "عاجل";
  if (t.status === "OVERDUE") return "متأخرة";
  return "قيد التنفيذ";
}

function buildOfficialReportHtml(items: TxItem[]): string {
  const printDate = formatDateTime(new Date().toISOString());
  const itemsHtml = items.map((t) => {
    const steps = getWorkflowSteps(t);
    const statusText = getStatusText(t);
    const completedBy = t.completedByAdmin ? "مدير المكتب" : t.delegateName ? `${t.delegateName} (المخول)` : "—";
    const duration = t.completedAt
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
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">تاريخ الإنشاء</td><td style="padding:8px 12px;border:1px solid #ccc">${formatDateShort(t.createdAt)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">الحالة الحالية</td><td style="padding:8px 12px;border:1px solid #ccc;font-weight:bold">${statusText}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">تاريخ الإنجاز</td><td style="padding:8px 12px;border:1px solid #ccc">${formatDateShort(t.completedAt)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">من أنجز</td><td style="padding:8px 12px;border:1px solid #ccc">${completedBy}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ccc;background:#fafafa">مدة الإنجاز</td><td style="padding:8px 12px;border:1px solid #ccc">${duration}</td></tr>
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
<head><meta charset="utf-8"><title>تقرير المعاملات المنجزة</title>
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
    <h1>تقرير رسمي — المعاملات المنجزة</h1>
    <p class="sub">قسم التنسيق والمتابعة — حالة المعاملة ومسيرتها</p>
    <p class="sub">تاريخ الطباعة: ${printDate}</p>
  </div>
  ${itemsHtml}
  <div class="footer">— نهاية التقرير —</div>
</body>
</html>`;
}

export default function CoordinatorCompletedPage() {
  const [list, setList] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTx, setViewTx] = useState<TxItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handlePrintReport = useCallback((items: TxItem[]) => {
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

  const selectAll = useCallback(() => setSelectedIds(new Set(list.map((t) => t.id))), [list]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

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

  const POLL_INTERVAL_MS = 4000;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions?status=DONE&limit=500", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setList(data.transactions || []);
      else setList([]);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B1B1B]">المعاملات المنجزة</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            المعاملات التي تم إنجازها — من المدير أو المخولين — تُحدَّث تلقائياً كل {POLL_INTERVAL_MS / 1000} ثوانٍ
          </p>
        </div>
        <Link href="/coordinator" className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] transition-colors hover:bg-[#f6f3ed]">
          لوحة التحكم
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5B7C99] border-t-transparent" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-[#d4cfc8] bg-white p-12 text-center shadow-sm">
          <p className="text-[#5a5a5a]">لا توجد معاملات منجزة حتى الآن.</p>
        </div>
      ) : (
        <>
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">ملخص</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">عدد المعاملات المنجزة</p>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#1E6B3A]/10">
                  <span className="text-2xl font-bold text-[#1E6B3A]">{list.length}</span>
                </div>
                <div>
                  <p className="font-semibold text-[#1B1B1B]">{list.length} معاملة منجزة</p>
                  <p className="text-sm text-[#5a5a5a]">من المدير أو المخولين</p>
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
                  onClick={() => handlePrintReport(list)}
                  className="rounded-lg border border-[#5B7C99]/50 bg-[#5B7C99]/10 px-4 py-2 text-sm font-medium text-[#5B7C99] hover:bg-[#5B7C99]/20"
                >
                  طباعة الكل
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintReport(list.filter((t) => selectedIds.has(t.id)))}
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

          <div className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-right text-sm">
                <thead>
                  <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                    <th className="border-l border-[#d4cfc8] px-3 py-3 font-medium text-[#5a5a5a] w-12"></th>
                    <th className="border-l border-[#d4cfc8] px-3 py-3 font-medium text-[#5a5a5a]">رقم المعاملة</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-3 font-medium text-[#5a5a5a]">المواطن</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-3 font-medium text-[#5a5a5a]">نوع المعاملة</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-3 font-medium text-[#5a5a5a]">تاريخ الإنجاز</th>
                    <th className="border-l border-[#d4cfc8] px-3 py-3 font-medium text-[#5a5a5a]">من أنجز</th>
                    <th className="px-3 py-3 font-medium text-[#5a5a5a]">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id} className={`border-b border-[#d4cfc8]/80 hover:bg-[#f6f3ed]/50 ${selectedIds.has(t.id) ? "bg-[#5B7C99]/5" : ""}`}>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="h-4 w-4 rounded border-[#d4cfc8] text-[#5B7C99] focus:ring-[#5B7C99]"
                        />
                      </td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-3 font-mono text-[#1B1B1B]">
                        {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                      </td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-3 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-3 text-[#1B1B1B]">{t.transactionType || t.type || "—"}</td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-3 text-[#5a5a5a]">{formatDate(t.completedAt)}</td>
                      <td className="border-l border-[#d4cfc8]/60 px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.completedByAdmin ? "bg-[#1E6B3A]/15 text-[#1E6B3A]" : "bg-amber-100 text-amber-800"}`}>
                          {t.completedByAdmin ? "مدير المكتب" : t.delegateName || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePrintReport([t])}
                            className="rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-3 py-1.5 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                          >
                            طباعة تقرير
                          </button>
                          <button
                            type="button"
                            onClick={() => handleView(t)}
                            className="rounded-lg border border-[#5B7C99]/50 bg-[#5B7C99]/10 px-3 py-1.5 text-xs font-medium text-[#5B7C99] hover:bg-[#5B7C99]/20"
                          >
                            عرض
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewTx && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewTx(null)} aria-hidden />
          <div className="relative mx-auto mt-8 mb-16 max-w-2xl rounded-2xl border border-[#d4cfc8] bg-[#FAFAF9] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">عرض المعاملة — منجزة</h3>
              <button type="button" onClick={() => setViewTx(null)} className="rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200" aria-label="إغلاق">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
