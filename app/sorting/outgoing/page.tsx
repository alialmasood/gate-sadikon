"use client";

import { useState, useCallback, useEffect } from "react";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";

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

const POLL_INTERVAL_MS = 4000;

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

export default function SortingOutgoingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1B1B1B]">المعاملات الصادرة</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            المعاملات المُرسلة كعاجلة إلى التنسيق — تُحدَّث تلقائياً كل {POLL_INTERVAL_MS / 1000} ثوانٍ
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
          <p className="text-[#5a5a5a]">لا توجد معاملات صادرة حالياً.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {transactions.map((t) => (
            <article
              key={t.id}
              className="relative flex flex-col overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-[#7C3AED]" dir="ltr">
                    {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                  </span>
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

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d4cfc8] pt-4">
                  <button
                    type="button"
                    onClick={() => handlePrint(t)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#B08D57]/50 bg-[#B08D57]/10 px-3 py-2 text-xs font-medium text-[#9C7B49] hover:bg-[#B08D57]/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4-1v8m0 0V5a2 2 0 012-2h6a2 2 0 012 2v8" />
                    </svg>
                    طباعة
                  </button>
                  <button
                    type="button"
                    onClick={() => handleView(t)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/50 bg-[#7C3AED]/10 px-3 py-2 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/20"
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
