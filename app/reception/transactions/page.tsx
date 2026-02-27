"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
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
};

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

const TRANSFER_OPTIONS = [
  { value: "SORTING", label: "قسم الفرز" },
  { value: "COORDINATION", label: "قسم التنسيق والمتابعة" },
  { value: "MANAGER", label: "المدير" },
];

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

export default function ReceptionTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [openTransferId, setOpenTransferId] = useState<string | null>(null);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const transferRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions?limit=200", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTransactions(data.transactions || []);
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
        const receipt: ReceiptData = {
          citizenName: data.citizenName,
          citizenPhone: data.citizenPhone,
          citizenAddress: data.citizenAddress,
          citizenMinistry: data.citizenMinistry,
          citizenDepartment: data.citizenDepartment,
          citizenOrganization: data.citizenOrganization,
          transactionType: data.transactionType || data.type,
          formationName: data.formationName ?? null,
          subDeptName: data.subDeptName ?? null,
          officeName: data.officeName,
          serialNumber: data.serialNumber,
          followUpUrl: data.followUpUrl ?? null,
          submissionDate: data.submissionDate,
          createdAt: data.createdAt,
        };
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

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (transferRef.current && !transferRef.current.contains(e.target as Node)) {
        setOpenTransferId(null);
      }
    };
    if (openTransferId) {
      document.addEventListener("click", onDocClick);
      return () => document.removeEventListener("click", onDocClick);
    }
  }, [openTransferId]);

  const handleTransfer = useCallback(async (t: Transaction, target: string) => {
    setOpenTransferId(null);
    setTransferringId(t.id);
    try {
      // TODO: استدعاء API التحويل عند توفره
      await new Promise((r) => setTimeout(r, 500));
      const label = TRANSFER_OPTIONS.find((o) => o.value === target)?.label || target;
      alert(`تم إرسال طلب التحويل إلى ${label}`);
      loadData();
    } finally {
      setTransferringId(null);
    }
  }, [loadData]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1B1B1B]">المعاملات</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            المعاملات المضافة من شؤون المواطنين — تحويل، طباعة، عرض
          </p>
        </div>
        <Link
          href="/reception/citizens/new"
          className="flex items-center gap-2 rounded-xl border border-[#0D9488] bg-[#0D9488] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0f766e] hover:border-[#0f766e]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          معاملة جديدة
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0D9488] border-t-transparent" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-[#d4cfc8] bg-white p-12 text-center shadow-sm">
          <p className="text-[#5a5a5a]">لا توجد معاملات مسجلة.</p>
          <Link
            href="/reception/citizens/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0D9488] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0f766e]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة معاملة جديدة
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {transactions.map((t) => (
            <article
              key={t.id}
              className={`relative flex flex-col rounded-2xl border border-[#d4cfc8] bg-white shadow-sm transition-shadow hover:shadow-md ${
                openTransferId === t.id ? "z-20 overflow-visible" : "overflow-hidden"
              }`}
            >
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-[#0D9488]" dir="ltr">
                    {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                  </span>
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
                <p className="mt-1 text-xs text-[#5a5a5a]">{formatDate(t.createdAt)}</p>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d4cfc8] pt-4">
                  <div className="relative" ref={openTransferId === t.id ? transferRef : undefined}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenTransferId((id) => (id === t.id ? null : t.id));
                      }}
                      disabled={transferringId === t.id}
                      className="flex items-center gap-1.5 rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-3 py-2 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20 disabled:opacity-60"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      تحويل المعاملة
                      <svg className={`h-3.5 w-3.5 transition-transform ${openTransferId === t.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openTransferId === t.id && (
                      <>
                        <div className="absolute inset-0 -z-10" aria-hidden />
                        <div className="absolute top-full right-0 z-[100] mt-1 min-w-[220px] rounded-lg border border-[#d4cfc8] bg-white py-1 shadow-lg">
                          {TRANSFER_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTransfer(t, opt.value);
                              }}
                              className="w-full px-4 py-2.5 text-right text-sm text-[#1B1B1B] hover:bg-[#f6f3ed]"
                            >
                              تحويل إلى {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
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
                    className="flex items-center gap-1.5 rounded-lg border border-[#0D9488]/50 bg-[#0D9488]/10 px-3 py-2 text-xs font-medium text-[#0f766e] hover:bg-[#0D9488]/20"
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
