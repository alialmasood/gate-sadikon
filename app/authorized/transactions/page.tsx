"use client";

import { useState, useCallback, useEffect } from "react";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";

type AttachmentItem = { url: string; name?: string };

function getAttachmentsList(attachments: unknown): AttachmentItem[] {
  if (!attachments || !Array.isArray(attachments)) return [];
  return attachments.filter(
    (a): a is AttachmentItem => a && typeof (a as AttachmentItem).url === "string"
  );
}

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
  urgent?: boolean;
  cannotComplete?: boolean;
  reachedSorting?: boolean;
  officeName: string | null;
  attachments?: unknown;
};

type FullTransaction = Transaction & {
  citizenMinistry?: string | null;
  citizenDepartment?: string | null;
  citizenOrganization?: string | null;
  transactionTitle?: string | null;
  formationName?: string | null;
  subDeptName?: string | null;
  followUpUrl?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
  REJECTED: "مرفوضة",
};

function getStatusDisplay(t: Transaction): { label: string; className: string } {
  if (t.status === "DONE") return { label: "منجزة", className: "bg-[#ccfbf1] text-[#0f766e]" };
  if (t.status === "OVERDUE") return { label: "متأخرة", className: "bg-red-100 text-red-700" };
  if (t.status === "REJECTED") return { label: "مرفوضة", className: "bg-red-100 text-red-700" };
  if (t.cannotComplete) return { label: "لا يمكن الإنجاز", className: "bg-slate-200 text-slate-700" };
  if (t.urgent) return { label: "وصلت قسم المتابعة", className: "bg-[#5B7C99]/20 text-[#5B7C99]" };
  if (t.reachedSorting) return { label: "وصلت قسم الفرز", className: "bg-[#7C3AED]/20 text-[#7C3AED]" };
  return {
    label: STATUS_LABELS[t.status] || t.status || "قيد التنفيذ",
    className: "bg-amber-100 text-amber-700",
  };
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

export default function AuthorizedTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/authorized/transactions?limit=200", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTransactions(data.transactions || []);
      } else {
        setError(data.error || "فشل تحميل المعاملات");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleView = useCallback(async (t: Transaction) => {
    try {
      const res = await fetch(`/api/authorized/transactions/${t.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setViewTransaction(data);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "فشل تحميل تفاصيل المعاملة");
      }
    } catch {
      alert("حدث خطأ غير متوقع");
    }
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-lg font-semibold text-[#1B1B1B]">المعاملات المستلمة</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">المعاملات المعينة إليك — عرض تفاصيل كل معاملة</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1E6B3A] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="mt-4 rounded-lg bg-[#1E6B3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#175a2e]"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-[#d4cfc8] bg-white p-12 text-center shadow-sm">
          <p className="text-[#5a5a5a]">لا توجد معاملات معينة إليك حالياً.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {transactions.map((t) => {
            const s = getStatusDisplay(t);
            return (
              <article
                key={t.id}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-[#1E6B3A]" dir="ltr">
                      {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
                      {s.label}
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
                  {t.officeName && (
                    <p className="mt-1 text-xs text-[#5a5a5a]">المكتب: {t.officeName}</p>
                  )}
                  {getAttachmentsList(t.attachments).length > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#0D9488]">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {getAttachmentsList(t.attachments).length} مرفق
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[#5a5a5a]">{formatDate(t.createdAt)}</p>
                  <div className="mt-4 border-t border-[#d4cfc8] pt-4">
                    <button
                      type="button"
                      onClick={() => handleView(t)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-3 py-2 text-sm font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      عرض التفاصيل
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
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

            {/* معلومات التحويل والمرفقات */}
            <div className="mb-6 space-y-4 rounded-xl border border-[#d4cfc8] bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1E6B3A]/10 text-[#1E6B3A]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-[#5a5a5a]">تم تحويل المعاملة من المكتب:</p>
                  <p className="mt-0.5 font-semibold text-[#1B1B1B]">{viewTransaction.officeName || "—"}</p>
                </div>
              </div>
              <div className="border-t border-[#d4cfc8]" />
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getAttachmentsList(viewTransaction.attachments).length > 0 ? "bg-[#0D9488]/10 text-[#0D9488]" : "bg-slate-100 text-slate-500"}`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#5a5a5a]">المرفقات:</p>
                  {getAttachmentsList(viewTransaction.attachments).length === 0 ? (
                    <p className="mt-0.5 text-sm text-slate-500">لا توجد مرفقات في هذه المعاملة</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {getAttachmentsList(viewTransaction.attachments).map((att, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-[#d4cfc8] bg-[#f6f3ed]/50 px-3 py-2">
                          <span className="truncate text-sm font-medium text-[#1B1B1B]" title={att.name || att.url}>
                            {att.name || `مرفق ${i + 1}`}
                          </span>
                          <div className="flex shrink-0 gap-2">
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 rounded-lg border border-[#0D9488]/50 bg-[#0D9488]/10 px-2.5 py-1.5 text-xs font-medium text-[#0f766e] hover:bg-[#0D9488]/20"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              عرض
                            </a>
                            <a
                              href={att.url}
                              download={att.name || `attachment-${i + 1}`}
                              className="flex items-center gap-1 rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-2.5 py-1.5 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              تحميل
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
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
