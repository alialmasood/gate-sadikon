"use client";

import { useState, useCallback, useEffect } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import Link from "next/link";

type AttachmentItem = { url: string; name?: string };

function getAttachmentsList(attachments: unknown): AttachmentItem[] {
  if (!attachments || !Array.isArray(attachments)) return [];
  return attachments.filter(
    (a): a is AttachmentItem => a && typeof (a as AttachmentItem).url === "string"
  );
}

type DelegateActionItem = { text: string; attachmentUrl?: string; attachmentName?: string; createdAt: string };

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
  assignedFromSection?: string | null;
  attachments?: unknown;
  delegateActions?: DelegateActionItem[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
  REJECTED: "مرفوضة",
};

const SECTION_LABELS: Record<string, string> = {
  SORTING: "قسم الفرز",
  ADMIN: "مكتب المدير",
  COORDINATOR: "قسم المتابعة",
  RECEPTION: "قسم الاستعلامات",
};

function getOfficeFromLabel(t: Transaction): string {
  const officeName = (t.officeName || "").trim() || "—";
  const sectionName = (t.assignedFromSection && SECTION_LABELS[t.assignedFromSection]) || t.assignedFromSection || "—";
  return `وصلت من ${officeName} من القسم ${sectionName}`;
}

function getStatusDisplay(t: Transaction): { label: string; className: string } {
  if (t.status === "DONE") return { label: "منجزة", className: "bg-[#ccfbf1] text-[#0f766e]" };
  if (t.status === "OVERDUE") return { label: "متأخرة", className: "bg-red-100 text-red-700" };
  if (t.status === "REJECTED") return { label: "مرفوضة", className: "bg-red-100 text-red-700" };
  if (t.cannotComplete) return { label: "لا يمكن الإنجاز", className: "bg-slate-200 text-slate-700" };
  if (t.urgent) return { label: getOfficeFromLabel(t), className: "bg-[#5B7C99]/20 text-[#5B7C99]" };
  if (t.reachedSorting) return { label: getOfficeFromLabel(t), className: "bg-[#7C3AED]/20 text-[#7C3AED]" };
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
  const [attachmentsModal, setAttachmentsModal] = useState<{ citizenName: string; attachments: AttachmentItem[] } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/authorized/transactions?limit=200&excludeCompleted=true", { credentials: "include" });
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

  useAutoRefresh(loadData);

  return (
    <div className="min-h-0 space-y-6 pb-[env(safe-area-inset-bottom)]" dir="rtl">
      {/* هيدر رسمي وواضح */}
      <header className="rounded-xl border border-[#2c3e50]/10 bg-white px-4 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1E6B3A]/10 text-[#1E6B3A]">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-[#1a1a2e] sm:text-2xl">المعاملات المستلمة</h1>
            <p className="mt-1 text-sm text-[#5a5a5a]">المعاملات المعينة إليك — عرض وإجراء المعاملات</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-[#2c3e50]/10 bg-white py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#1E6B3A] border-t-transparent" />
          <p className="text-sm text-[#5a5a5a]">جاري تحميل المعاملات...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-center">
          <p className="text-amber-800">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="mt-4 min-h-[44px] rounded-xl bg-[#1E6B3A] px-6 py-3 text-sm font-medium text-white active:scale-[0.98]"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl border border-[#2c3e50]/10 bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[#5a5a5a]">لا توجد معاملات معينة إليك حالياً.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {transactions.map((t) => {
            const s = getStatusDisplay(t);
            return (
              <article
                key={t.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-[#2c3e50]/10 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:shadow-md active:scale-[0.995]"
              >
                <div className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-[#2c3e50]/8 bg-[#f8fafc] px-4 py-3">
                  <span className="font-mono text-sm font-bold text-[#1E6B3A]" dir="ltr">
                    {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                  </span>
                  <span
                    title={s.label}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-right text-xs font-medium ${s.className}`}
                  >
                    {s.label}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="truncate font-semibold text-[#1a1a2e]">{t.citizenName || "—"}</h3>
                  <p className="mt-1 text-sm text-[#5a5a5a]" dir="ltr">
                    {t.citizenPhone || "—"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-[#5a5a5a]">
                    {t.transactionType || t.type || "—"}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5a5a5a]">
                    {t.officeName ? <span>المكتب: {t.officeName}</span> : null}
                    <span>{formatDate(t.createdAt)}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="flex items-center gap-1.5 text-[#5B7C99]">
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {(() => {
                        const n = t.delegateActions?.length ?? 0;
                        return n === 0 ? "لا إجراءات مسجّلة" : n === 1 ? "إجراء واحد مسجّل" : `${n} إجراءات مسجّلة`;
                      })()}
                    </span>
                    <span className="flex items-center gap-1.5 text-[#0D9488]">
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {getAttachmentsList(t.attachments).length} مرفق
                    </span>
                  </p>
                  <div className="mt-4 flex flex-row gap-2 border-t border-[#2c3e50]/8 pt-4">
                    <Link
                      href={`/authorized/transactions/${t.id}`}
                      className="flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E6B3A] px-4 py-3 text-sm font-medium text-white active:scale-[0.98] hover:bg-[#175a2e]"
                    >
                      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      البدء بالإجراءات
                    </Link>
                    <Link
                      href={`/authorized/transactions/${t.id}`}
                      className="flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-[#1E6B3A]/40 bg-[#1E6B3A]/5 px-4 py-3 text-sm font-medium text-[#1E6B3A] active:scale-[0.98] hover:bg-[#1E6B3A]/10"
                    >
                      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      عرض التفاصيل
                    </Link>
                  </div>
                  {getAttachmentsList(t.attachments).length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setAttachmentsModal({
                          citizenName: t.citizenName || "—",
                          attachments: getAttachmentsList(t.attachments),
                        })
                      }
                      className="mt-2 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-[#2c3e50]/20 bg-[#f8fafc] px-4 py-2.5 text-sm font-medium text-[#5a5a5a] active:scale-[0.98] hover:bg-[#2c3e50]/5 hover:text-[#1a1a2e]"
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      عرض المرفقات
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* نافذة عرض المرفقات */}
      {attachmentsModal && (
        <div className="fixed inset-0 z-50 flex flex-col overscroll-contain" dir="rtl">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setAttachmentsModal(null)}
            aria-hidden
          />
          <div className="relative mx-auto mt-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border-t border-[#2c3e50]/10 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2c3e50]/10 px-4 py-4">
              <h3 className="text-lg font-bold text-[#1a1a2e]">المرفقات — {attachmentsModal.citizenName}</h3>
              <button
                type="button"
                onClick={() => setAttachmentsModal(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#5a5a5a] hover:bg-[#2c3e50]/10 active:scale-95"
                aria-label="إغلاق"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-4 text-sm text-[#5a5a5a]">عرض المرفق مباشرة ثم تحميله عند الحاجة</p>
              <ul className="space-y-4">
                {attachmentsModal.attachments.map((att, i) => {
                  const nameOrPath = att.name || att.url.split("?")[0];
                  const ext = nameOrPath.toLowerCase().split(".").pop() || "";
                  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext);
                  const isPdf = ext === "pdf";
                  const canPreview = isImage || isPdf;
                  return (
                    <li
                      key={i}
                      className="flex flex-col gap-3 rounded-xl border border-[#2c3e50]/10 bg-[#f8fafc] p-3"
                    >
                      <span className="truncate text-sm font-medium text-[#1a1a2e]" title={att.name || att.url}>
                        {att.name || `مرفق ${i + 1}`}
                      </span>
                      {canPreview && (
                        <div className="max-h-48 overflow-hidden rounded-lg border border-[#2c3e50]/10 bg-white">
                          {isImage ? (
                            <img
                              src={att.url}
                              alt={att.name || `مرفق ${i + 1}`}
                              className="h-auto max-h-48 w-full object-contain"
                            />
                          ) : (
                            <iframe
                              src={att.url}
                              title={att.name || `مرفق ${i + 1}`}
                              className="h-48 w-full"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex flex-row flex-wrap gap-2">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-[#0D9488]/50 bg-[#0D9488]/10 px-4 py-2 text-sm font-medium text-[#0f766e] hover:bg-[#0D9488]/20"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          عرض في تبويب جديد
                        </a>
                        <a
                          href={att.url}
                          download={att.name || `attachment-${i + 1}`}
                          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-4 py-2 text-sm font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          تحميل
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
