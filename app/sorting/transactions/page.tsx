"use client";

import { useState, useCallback, useEffect } from "react";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";

type Transaction = {
  id: string;
  citizenName: string | null;
  citizenPhone: string | null;
  citizenAddress: string | null;
  citizenIsEmployee?: boolean | null;
  citizenEmployeeSector?: string | null;
  citizenMinistry?: string | null;
  citizenDepartment?: string | null;
  citizenOrganization?: string | null;
  status: string;
  type: string | null;
  transactionType: string | null;
  transactionTitle?: string | null;
  serialNumber: string | null;
  submissionDate: string | null;
  attachments?: unknown;
  createdAt: string;
  completedAt: string | null;
  delegateName: string | null;
  urgent?: boolean;
  cannotComplete?: boolean;
  reachedSorting?: boolean;
};

const SECTOR_LABELS: Record<string, string> = {
  GOVERNMENT: "حكومي",
  PRIVATE: "قطاع خاص",
  MIXED: "قطاع مشترك",
  NOT_LINKED: "جهة غير مرتبطة بوزارة",
  OTHER: "جهة أخرى",
};

function getEmployeeInfo(t: Transaction): string {
  if (t.citizenIsEmployee !== true) return "—";
  const sector = SECTOR_LABELS[t.citizenEmployeeSector || ""] || t.citizenEmployeeSector || "";
  if (!sector) return "موظف";
  if (t.citizenEmployeeSector === "GOVERNMENT") {
    const parts = [t.citizenMinistry, t.citizenDepartment].filter(Boolean);
    return parts.length ? `${sector} (${parts.join(" / ")})` : sector;
  }
  if (t.citizenOrganization) return `${sector} (${t.citizenOrganization})`;
  return sector;
}

function getAttachmentsCount(attachments: unknown): number {
  if (!attachments || !Array.isArray(attachments)) return 0;
  return attachments.filter((a: { url?: string }) => a?.url).length;
}

type FullTransaction = Transaction & {
  citizenAddress?: string | null;
  citizenIsEmployee?: boolean | null;
  citizenEmployeeSector?: string | null;
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

const POLL_INTERVAL_MS = 6000;

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

export default function SortingTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions?limit=200", { credentials: "include" });
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1B1B1B]">جميع المعاملات</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            جميع المعاملات — تُحدَّث تلقائياً كل {POLL_INTERVAL_MS / 1000} ثوانٍ
            {lastUpdate && (
              <span className="mr-2 text-xs text-[#7C3AED]">(آخر تحديث: {formatDate(lastUpdate.toISOString())})</span>
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-[#d4cfc8] bg-white p-12 text-center shadow-sm">
          <p className="text-[#5a5a5a]">لا توجد معاملات حالياً.</p>
        </div>
      ) : (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-[#1B1B1B]">جدول المعاملات</h2>
            <p className="mt-1 text-sm text-[#5a5a5a]">جميع المعاملات المسجلة — عرض رسمي</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-right text-sm">
              <thead>
                <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">رقم المعاملة</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">اسم المواطن</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">الهاتف</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">العنوان</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">نوع المعاملة</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">موظف / جهة العمل</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">تاريخ التقديم</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">الحالة</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">المخول</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">تاريخ الإنشاء</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">مرفقات</th>
                  <th className="py-3 px-3 font-medium text-[#5a5a5a]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[#d4cfc8]/80 transition hover:bg-[#f6f3ed]/50"
                  >
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 font-mono text-[#7C3AED]">
                      {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                    </td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 text-[#5a5a5a]" dir="ltr">{t.citizenPhone || "—"}</td>
                    <td className="max-w-[140px] truncate border-l border-[#d4cfc8]/60 py-3 px-3 text-[#5a5a5a]" title={t.citizenAddress || undefined}>
                      {t.citizenAddress || "—"}
                    </td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 text-[#1B1B1B]">{t.transactionType || t.type || "—"}</td>
                    <td className="max-w-[160px] truncate border-l border-[#d4cfc8]/60 py-3 px-3 text-[#5a5a5a]" title={getEmployeeInfo(t)}>
                      {getEmployeeInfo(t)}
                    </td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 text-[#5a5a5a]">{formatDate(t.submissionDate)}</td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3">
                      {t.cannotComplete ? (
                        <span className="inline-block rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                          لا يمكن الانجاز
                        </span>
                      ) : t.delegateName ? (
                        <span className="inline-block rounded-full bg-[#1E6B3A]/20 px-2 py-0.5 text-xs font-medium text-[#1E6B3A]">
                          إلى مخول
                        </span>
                      ) : t.urgent ? (
                        <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          عاجل
                        </span>
                      ) : t.reachedSorting ? (
                        <span className="inline-block rounded-full bg-[#7C3AED]/20 px-2 py-0.5 text-xs font-medium text-[#7C3AED]">
                          وصلت قسم الفرز
                        </span>
                      ) : (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.status === "DONE"
                              ? "bg-[#ccfbf1] text-[#0f766e]"
                              : t.status === "OVERDUE"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {STATUS_LABELS[t.status] || t.status}
                        </span>
                      )}
                    </td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 text-[#5a5a5a]">{t.delegateName || "—"}</td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 text-[#5a5a5a]">{formatDate(t.createdAt)}</td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3">
                      {getAttachmentsCount(t.attachments) > 0 ? (
                        <span className="text-[#7C3AED]">{getAttachmentsCount(t.attachments)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => handleView(t)}
                        className="rounded-lg border border-[#7C3AED]/50 bg-[#7C3AED]/10 px-2 py-1 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/20"
                      >
                        عرض
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
