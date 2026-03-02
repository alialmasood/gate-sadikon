"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";

const SOURCE_SECTION_LABELS: Record<string, string> = {
  RECEPTION: "الاستعلامات والاستقبال",
  COORDINATOR: "المتابعة",
  DOCUMENTATION: "التوثيق",
  ADMIN: "مدير المكتب",
  SORTING: "الفرز",
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
  completedByAdmin?: boolean;
  formationName?: string | null;
  officeName?: string | null;
  sourceSection?: string | null;
};

type DelegateOption = {
  id: string;
  name: string;
  formationNames: string[];
  isSuggested: boolean;
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

export default function SortingReceivedPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [delegateModalTransaction, setDelegateModalTransaction] = useState<Transaction | null>(null);
  const [delegates, setDelegates] = useState<DelegateOption[]>([]);
  const [delegatesLoading, setDelegatesLoading] = useState(false);
  const [selectedDelegateId, setSelectedDelegateId] = useState<string | null>(null);
  const [sendingToDelegate, setSendingToDelegate] = useState(false);
  const [cannotCompleteModalOpen, setCannotCompleteModalOpen] = useState(false);
  const [cannotCompleteTransaction, setCannotCompleteTransaction] = useState<Transaction | null>(null);
  const [cannotCompleteReason, setCannotCompleteReason] = useState("");
  const [submittingCannotComplete, setSubmittingCannotComplete] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions?limit=200", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const all = data.transactions || [];
        setTransactions(all.filter((x: Transaction) => !x.urgent && !x.cannotComplete && !x.completedByAdmin));
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

  const stats = useMemo(() => {
    const total = transactions.length;
    const pending = transactions.filter((t) => t.status === "PENDING").length;
    const overdue = transactions.filter((t) => t.status === "OVERDUE").length;
    return { total, pending, overdue };
  }, [transactions]);

  const sourceSectionBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      const key =
        (t.sourceSection && SOURCE_SECTION_LABELS[t.sourceSection]) ||
        t.sourceSection ||
        "غير محدد";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transactions]);

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

  const handleUrgent = useCallback(
    async (t: Transaction) => {
      if (t.urgent) return;
      try {
        const res = await fetch(`/api/admin/transactions/${t.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ urgent: true }),
        });
        if (res.ok) {
          setTransactions((prev) => prev.filter((x) => x.id !== t.id));
          router.push("/sorting/outgoing");
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "فشل وضع علامة عاجل");
        }
      } catch {
        alert("حدث خطأ غير متوقع");
      }
    },
    [router]
  );

  const openDelegateModal = useCallback(async (t: Transaction) => {
    setDelegateModalTransaction(t);
    setSelectedDelegateId(null);
    setDelegateModalOpen(true);
    setDelegatesLoading(true);
    try {
      const res = await fetch(`/api/sorting/delegates-for-assign?transactionId=${encodeURIComponent(t.id)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDelegates(data.delegates || []);
        if (data.suggestedIds?.length === 1) {
          setSelectedDelegateId(data.suggestedIds[0]);
        } else if (data.suggestedIds?.length > 0) {
          setSelectedDelegateId(data.suggestedIds[0]);
        }
      } else {
        setDelegates([]);
      }
    } finally {
      setDelegatesLoading(false);
    }
  }, []);

  const closeDelegateModal = useCallback(() => {
    setDelegateModalOpen(false);
    setDelegateModalTransaction(null);
    setDelegates([]);
    setSelectedDelegateId(null);
  }, []);

  const handleSendToDelegate = useCallback(async () => {
    if (!delegateModalTransaction || !selectedDelegateId) {
      alert("يرجى اختيار مخول");
      return;
    }
    setSendingToDelegate(true);
    try {
      const res = await fetch(`/api/admin/transactions/${delegateModalTransaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delegateId: selectedDelegateId }),
      });
      if (res.ok) {
        setTransactions((prev) => prev.filter((x) => x.id !== delegateModalTransaction.id));
        closeDelegateModal();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "فشل إرسال المعاملة للمخول");
      }
    } catch {
      alert("حدث خطأ غير متوقع");
    } finally {
      setSendingToDelegate(false);
    }
  }, [delegateModalTransaction, selectedDelegateId, closeDelegateModal]);

  const openCannotCompleteModal = useCallback((t: Transaction) => {
    setCannotCompleteTransaction(t);
    setCannotCompleteReason("");
    setCannotCompleteModalOpen(true);
  }, []);

  const closeCannotCompleteModal = useCallback(() => {
    setCannotCompleteModalOpen(false);
    setCannotCompleteTransaction(null);
    setCannotCompleteReason("");
  }, []);

  const handleSubmitCannotComplete = useCallback(async () => {
    if (!cannotCompleteTransaction) return;
    if (!cannotCompleteReason.trim()) {
      alert("يرجى إدخال سبب عدم الإنجاز");
      return;
    }
    setSubmittingCannotComplete(true);
    try {
      const res = await fetch(`/api/admin/transactions/${cannotCompleteTransaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cannotComplete: true, cannotCompleteReason: cannotCompleteReason.trim() }),
      });
      if (res.ok) {
        setTransactions((prev) => prev.filter((x) => x.id !== cannotCompleteTransaction.id));
        closeCannotCompleteModal();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "فشل تحديث الحالة");
      }
    } catch {
      alert("حدث خطأ غير متوقع");
    } finally {
      setSubmittingCannotComplete(false);
    }
  }, [cannotCompleteTransaction, cannotCompleteReason, closeCannotCompleteModal]);

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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B1B1B]">المعاملات المستلمة</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            المعاملات الواردة من وحدة الاستقبال — تُحدَّث تلقائياً كل {POLL_INTERVAL_MS / 1000} ثوانٍ
            {lastUpdate && (
              <span className="mr-2 text-xs text-[#7C3AED]">(آخر تحديث: {formatDate(lastUpdate.toISOString())})</span>
            )}
          </p>
        </div>
        <Link
          href="/sorting"
          className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] transition-colors hover:bg-[#f6f3ed]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          لوحة التحكم
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* بطاقات إحصائية */}
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">ملخص إحصائي</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">عدد المعاملات المستلمة حسب الحالة</p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-3">
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#7C3AED] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">إجمالي المعاملات المستلمة</p>
                <p className="mt-2 text-2xl font-bold text-[#7C3AED]">{stats.total}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#B08D57] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">قيد التنفيذ</p>
                <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{stats.pending}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#b91c1c] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">متأخرة</p>
                <p className="mt-2 text-2xl font-bold text-[#b91c1c]">{stats.overdue}</p>
              </div>
            </div>
            {sourceSectionBreakdown.length > 0 && (
              <div className="border-t border-[#d4cfc8] bg-[#f6f3ed]/30 px-6 py-4">
                <p className="mb-3 text-sm font-medium text-[#5a5a5a]">حسب القسم المصدر (صفحة الاستقبال أو المتابعة أو التوثيق، إلخ) — أعلى ٥</p>
                <div className="flex flex-wrap gap-3">
                  {sourceSectionBreakdown.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#d4cfc8] bg-white px-3 py-1.5 text-sm"
                    >
                      <span className="font-medium text-[#1B1B1B]">{item.name}</span>
                      <span className="rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-xs font-bold text-[#7C3AED]">
                        {item.value}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {transactions.length === 0 ? (
            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="flex flex-col items-center justify-center gap-4 p-12">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f6f3ed] text-[#7C3AED]/50">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </span>
                <p className="text-center text-[#5a5a5a]">لا توجد معاملات مستلمة حالياً.</p>
                <Link
                  href="/sorting"
                  className="rounded-xl border border-[#7C3AED]/50 bg-[#7C3AED]/10 px-4 py-2 text-sm font-medium text-[#7C3AED] hover:bg-[#7C3AED]/20"
                >
                  العودة للوحة التحكم
                </Link>
              </div>
            </article>
          ) : (
            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
                <h2 className="text-base font-semibold text-[#1B1B1B]">قائمة المعاملات</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">إجراءات: عاجل — إرسال لمخول — تعذر الإنجاز — طباعة — عرض</p>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  <button
                    type="button"
                    onClick={() => handleUrgent(t)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    عاجل
                  </button>
                  <button
                    type="button"
                    onClick={() => openDelegateModal(t)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-3 py-2 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    الى مخول
                  </button>
                  <button
                    type="button"
                    onClick={() => openCannotCompleteModal(t)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-400/50 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    لا يمكن الانجاز
                  </button>
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
            </article>
          )}
        </>
      )}

      {delegateModalOpen && delegateModalTransaction && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50" onClick={closeDelegateModal} aria-hidden />
          <div className="relative mx-auto mt-8 mb-16 w-full max-w-lg rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">إرسال المعاملة إلى مخول</h3>
              <button
                type="button"
                onClick={closeDelegateModal}
                className="rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200"
                aria-label="إغلاق"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-4 text-sm text-[#5a5a5a]">
              المعاملة: <span className="font-mono font-bold text-[#7C3AED]">{delegateModalTransaction.serialNumber ? `2026-${delegateModalTransaction.serialNumber}` : delegateModalTransaction.id.slice(-8)}</span>
              {" — "}{delegateModalTransaction.citizenName || "—"}
            </p>
            {delegatesLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E6B3A] border-t-transparent" />
              </div>
            ) : delegates.length === 0 ? (
              <p className="py-6 text-center text-[#5a5a5a]">لا يوجد مخولون مسجلون في النظام.</p>
            ) : (
              <>
                <p className="mb-2 text-xs font-medium text-[#5a5a5a]">اختر المخول (الاقتراح حسب الوزارة/التشكيل):</p>
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[#d4cfc8] p-2">
                  {delegates.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDelegateId(d.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-right transition-all ${
                        selectedDelegateId === d.id
                          ? "border-[#1E6B3A] bg-[#e8f0eb]"
                          : "border-transparent hover:bg-[#f6f3ed]"
                      }`}
                    >
                      <div className="flex-1 text-right">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#1B1B1B]">{d.name}</span>
                          {d.isSuggested && (
                            <span className="rounded-full bg-[#1E6B3A]/20 px-2 py-0.5 text-xs font-medium text-[#1E6B3A]">
                              مقترح
                            </span>
                          )}
                        </div>
                        {d.formationNames.length > 0 && (
                          <p className="mt-1 text-xs text-[#5a5a5a]">{d.formationNames.join("، ")}</p>
                        )}
                      </div>
                      {selectedDelegateId === d.id && (
                        <svg className="h-5 w-5 shrink-0 text-[#1E6B3A]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDelegateModal}
                    className="rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSendToDelegate}
                    disabled={!selectedDelegateId || sendingToDelegate}
                    className="flex items-center gap-2 rounded-xl bg-[#1E6B3A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#175a2e] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingToDelegate ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                    إرسال
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {cannotCompleteModalOpen && cannotCompleteTransaction && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50" onClick={closeCannotCompleteModal} aria-hidden />
          <div className="relative mx-auto mt-8 mb-16 w-full max-w-lg rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">سبب عدم الإنجاز</h3>
              <button
                type="button"
                onClick={closeCannotCompleteModal}
                className="rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200"
                aria-label="إغلاق"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-4 text-sm text-[#5a5a5a]">
              المعاملة: <span className="font-mono font-bold text-[#7C3AED]">{cannotCompleteTransaction.serialNumber ? `2026-${cannotCompleteTransaction.serialNumber}` : cannotCompleteTransaction.id.slice(-8)}</span>
              {" — "}{cannotCompleteTransaction.citizenName || "—"}
            </p>
            <div className="mb-6">
              <label htmlFor="cannot-complete-reason" className="mb-2 block text-sm font-medium text-[#1B1B1B]">
                سبب عدم الإنجاز
              </label>
              <textarea
                id="cannot-complete-reason"
                value={cannotCompleteReason}
                onChange={(e) => setCannotCompleteReason(e.target.value)}
                placeholder="أدخل سبب عدم إمكانية إنجاز هذه المعاملة..."
                rows={4}
                className="w-full rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] px-4 py-3 text-base text-[#1B1B1B] placeholder:text-gray-500 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/25"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCannotCompleteModal}
                className="rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSubmitCannotComplete}
                disabled={!cannotCompleteReason.trim() || submittingCannotComplete}
                className="flex items-center gap-2 rounded-xl bg-slate-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingCannotComplete ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
                ارسال او اكمال
              </button>
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
