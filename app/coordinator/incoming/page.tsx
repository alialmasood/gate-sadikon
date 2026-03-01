"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";
import { TransactionWorkflowChain } from "@/components/TransactionWorkflowChain";

type DelegateActionItem = {
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
};

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
  formationName?: string | null;
  updatedAt?: string | null;
  delegateActions?: DelegateActionItem[];
};

type FullTransaction = Transaction & {
  citizenMinistry?: string | null;
  citizenDepartment?: string | null;
  citizenOrganization?: string | null;
  transactionTitle?: string | null;
  officeName?: string | null;
  subDeptName?: string | null;
  followUpUrl?: string | null;
};

const POLL_INTERVAL_MS = 3000;

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

function getStatusBadge(t: Transaction) {
  if (t.completedByAdmin || t.status === "DONE")
    return { label: "منجزة", className: "bg-[#1E6B3A]/10 text-[#1E6B3A]" };
  if (t.urgent)
    return { label: "عاجل", className: "bg-red-100 text-red-700" };
  if (t.cannotComplete)
    return { label: "تعذر إنجازها", className: "bg-slate-200 text-slate-700" };
  if (t.delegateName)
    return { label: "محوّلة لمخول", className: "bg-[#1E6B3A]/20 text-[#1E6B3A]" };
  if (t.status === "OVERDUE")
    return { label: "متأخرة", className: "bg-red-100 text-red-700" };
  return { label: "قيد التنفيذ", className: "bg-amber-100 text-amber-700" };
}

type ReportPeriod = "day" | "week" | "month";

export default function CoordinatorIncomingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("week");

  const loadData = useCallback(async () => {
    try {
      const [resUrgent, resAll, resCannot, resCompleted] = await Promise.all([
        fetch("/api/transactions?limit=500&urgent=true", { credentials: "include" }),
        fetch("/api/transactions?limit=500", { credentials: "include" }),
        fetch("/api/transactions?limit=500&cannotComplete=true", { credentials: "include" }),
        fetch("/api/transactions?limit=500&completedByAdmin=true", { credentials: "include" }),
      ]);
      const dataUrgent = await resUrgent.json().catch(() => ({}));
      const dataAll = await resAll.json().catch(() => ({}));
      const dataCannot = await resCannot.json().catch(() => ({}));
      const dataCompleted = await resCompleted.json().catch(() => ({}));

      const urgentList = dataUrgent.transactions || [];
      const allList = dataAll.transactions || [];
      const cannotList = dataCannot.transactions || [];
      const completedList = dataCompleted.transactions || [];

      const seen = new Set<string>();
      const merged: Transaction[] = [];
      for (const t of [...urgentList, ...allList, ...cannotList, ...completedList]) {
        const isIncoming = t.urgent || t.delegateName || t.cannotComplete || t.completedByAdmin;
        if (isIncoming && !seen.has(t.id)) {
          seen.add(t.id);
          merged.push(t);
        }
      }
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(merged);
      setLastUpdate(new Date());
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

  const handlePrint = useCallback(async (t: Transaction) => {
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

  const stats = {
    total: transactions.length,
    urgent: transactions.filter((t) => t.urgent).length,
    delegated: transactions.filter((t) => t.delegateName).length,
    cannotComplete: transactions.filter((t) => t.cannotComplete).length,
  };

  const reportData = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    if (reportPeriod === "day") {
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setDate(startDate.getDate() - (reportPeriod === "week" ? 7 : 30));
      startDate.setHours(0, 0, 0, 0);
    }

    const isCompleted = (t: Transaction) => t.completedByAdmin || t.status === "DONE";
    const getCompletionTime = (t: Transaction) =>
      (t.completedAt ? new Date(t.completedAt) : t.updatedAt ? new Date(t.updatedAt) : null);

    const completed = transactions
      .filter((t) => {
        if (!isCompleted(t)) return false;
        const ct = getCompletionTime(t);
        return ct && ct >= startDate;
      })
      .map((t) => {
        const start = t.submissionDate || t.createdAt;
        const end = t.completedAt || t.updatedAt || t.createdAt;
        const durationDays = daysBetween(start, end);
        return { ...t, durationDays, completedAt: getCompletionTime(t) };
      })
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));

    const atDelegate = transactions
      .filter((t) => t.delegateName && !isCompleted(t))
      .map((t) => {
        const ref = t.updatedAt || t.createdAt;
        const daysAtDelegate = daysBetween(ref, now.toISOString());
        return { ...t, daysAtDelegate };
      })
      .sort((a, b) => b.daysAtDelegate - a.daysAtDelegate);

    const periodLabel =
      reportPeriod === "day" ? "اليوم" : reportPeriod === "week" ? "آخر 7 أيام" : "آخر 30 يوم";
    return { completed, atDelegate, periodLabel, startDate };
  }, [transactions, reportPeriod, lastUpdate]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B1B1B]">المعاملات الواردة</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            المعاملات المُرسلة من قسم الفرز — تُحدَّث تلقائياً كل {POLL_INTERVAL_MS / 1000} ثوانٍ
            {lastUpdate && (
              <span className="mr-2 text-xs text-[#5B7C99]">(آخر تحديث: {formatDate(lastUpdate.toISOString())})</span>
            )}
          </p>
        </div>
        <Link
          href="/coordinator"
          className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] transition-colors hover:bg-[#f6f3ed]"
        >
          لوحة التحكم
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5B7C99] border-t-transparent" />
        </div>
      ) : transactions.length === 0 ? (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center gap-4 p-12">
            <p className="text-[#5a5a5a]">لا توجد معاملات واردة حالياً.</p>
            <Link href="/coordinator" className="rounded-xl border border-[#5B7C99]/50 bg-[#5B7C99]/10 px-4 py-2 text-sm font-medium text-[#5B7C99] hover:bg-[#5B7C99]/20">
              العودة للوحة التحكم
            </Link>
          </div>
        </article>
      ) : (
        <>
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">ملخص إحصائي</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">توزيع المعاملات الواردة حسب النوع</p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-4">
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#5B7C99] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">الإجمالي</p>
                <p className="mt-2 text-2xl font-bold text-[#5B7C99]">{stats.total}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-red-200 border-r-4 border-r-red-500 bg-red-50/50 p-4 shadow-sm">
                <p className="text-sm font-medium text-red-700">عاجل</p>
                <p className="mt-2 text-2xl font-bold text-red-700">{stats.urgent}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-[#ccfbf1]/30 p-4 shadow-sm">
                <p className="text-sm font-medium text-[#0f766e]">محوّلة لمخول</p>
                <p className="mt-2 text-2xl font-bold text-[#0f766e]">{stats.delegated}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-slate-200 border-r-4 border-r-slate-500 bg-slate-50/50 p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-700">تعذر إنجازها</p>
                <p className="mt-2 text-2xl font-bold text-slate-700">{stats.cannotComplete}</p>
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">تقرير المتابعة والإنجاز</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">
                متابعة المعاملات المنجزة ومدة بقاء المعاملات عند المخول — لغرض قياس فترة الإنجاز
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["day", "week", "month"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setReportPeriod(p)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      reportPeriod === p
                        ? "bg-[#5B7C99] text-white"
                        : "border border-[#d4cfc8] bg-white text-[#5a5a5a] hover:bg-[#f6f3ed]"
                    }`}
                  >
                    {p === "day" ? "يومي" : p === "week" ? "أسبوعي" : "شهري"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              <div className="rounded-xl border border-[#d4cfc8] bg-[#ccfbf1]/20">
                <h3 className="border-b border-[#d4cfc8] bg-[#1E6B3A]/10 px-4 py-3 text-sm font-semibold text-[#1E6B3A]">
                  معاملات منجزة ({reportData.periodLabel})
                </h3>
                <div className="max-h-64 overflow-y-auto p-2">
                  {reportData.completed.length === 0 ? (
                    <p className="py-4 text-center text-sm text-[#5a5a5a]">لا توجد معاملات منجزة في هذه الفترة</p>
                  ) : (
                    <ul className="space-y-2">
                      {reportData.completed.map((t) => {
                        const orig = transactions.find((x) => x.id === t.id);
                        return (
                        <li
                          key={t.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => orig && handleView(orig)}
                          onKeyDown={(e) => e.key === "Enter" && orig && handleView(orig)}
                          className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border border-[#d4cfc8] bg-white p-3 transition-colors hover:border-[#5B7C99]/40 hover:bg-[#5B7C99]/5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-[#1B1B1B]">{t.citizenName || "—"}</p>
                            <p className="text-xs text-[#5a5a5a]">{t.serialNumber ? `2026-${t.serialNumber}` : ""}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#1E6B3A]/15 px-2.5 py-0.5 text-xs font-medium text-[#1E6B3A]">
                            أُنجزت خلال {formatDuration(t.durationDays)}
                          </span>
                        </li>
                      );})}
                    </ul>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-[#d4cfc8] bg-amber-50/50">
                <h3 className="border-b border-[#d4cfc8] bg-amber-100/60 px-4 py-3 text-sm font-semibold text-amber-800">
                  معاملات عند المخول (غير منجزة)
                </h3>
                <div className="max-h-64 overflow-y-auto p-2">
                  {reportData.atDelegate.length === 0 ? (
                    <p className="py-4 text-center text-sm text-[#5a5a5a]">لا توجد معاملات عند المخول حالياً</p>
                  ) : (
                    <ul className="space-y-2">
                      {reportData.atDelegate.map((t) => (
                        <li
                          key={t.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleView(t)}
                          onKeyDown={(e) => e.key === "Enter" && handleView(t)}
                          className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border border-[#d4cfc8] bg-white p-3 transition-colors hover:border-[#5B7C99]/40 hover:bg-[#5B7C99]/5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-[#1B1B1B]">{t.citizenName || "—"}</p>
                            <p className="text-xs text-[#5a5a5a]">
                              {t.serialNumber ? `2026-${t.serialNumber}` : ""} — {t.delegateName || ""}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            باقية منذ {formatDuration(t.daysAtDelegate)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {transactions.map((t) => {
              const badge = getStatusBadge(t);
              return (
                <article
                  key={t.id}
                  className="relative flex flex-col overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-[#5B7C99]" dir="ltr">
                        {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="truncate font-semibold text-[#1B1B1B]">{t.citizenName || "—"}</h3>
                    <p className="mt-1 text-sm text-[#5a5a5a]" dir="ltr">{t.citizenPhone || "—"}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-[#5a5a5a]">{t.transactionType || t.type || "—"}</p>
                    <p className="mt-1 text-xs text-[#5a5a5a]">{formatDate(t.createdAt)}</p>

                    <div className="mt-4">
                      <TransactionWorkflowChain transaction={t} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d4cfc8] pt-4">
                      <button
                        type="button"
                        onClick={() => handlePrint(t)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#B08D57]/50 bg-[#B08D57]/10 px-3 py-2 text-xs font-medium text-[#9C7B49] hover:bg-[#B08D57]/20"
                      >
                        طباعة
                      </button>
                      <button
                        type="button"
                        onClick={() => handleView(t)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#5B7C99]/50 bg-[#5B7C99]/10 px-3 py-2 text-xs font-medium text-[#5B7C99] hover:bg-[#5B7C99]/20"
                      >
                        عرض
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {viewTransaction && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewTransaction(null)} aria-hidden />
          <div className="relative mx-auto mt-8 mb-16 max-w-2xl rounded-2xl border border-[#d4cfc8] bg-[#FAFAF9] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">عرض وصل المعاملة</h3>
              <button type="button" onClick={() => setViewTransaction(null)} className="rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200" aria-label="إغلاق">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {viewTransaction.delegateActions && viewTransaction.delegateActions.length > 0 && (
              <div className="mb-6 rounded-xl border border-[#5B7C99]/20 bg-[#5B7C99]/5 p-4">
                <h3 className="mb-3 text-sm font-bold text-[#5B7C99]">تحديثات المخول</h3>
                <ul className="space-y-2">
                  {viewTransaction.delegateActions.map((a, i) => (
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
