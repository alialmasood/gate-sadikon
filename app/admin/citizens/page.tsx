"use client";

import { useEffect, useState, useCallback } from "react";
import AddTransactionModal from "./AddTransactionModal";
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
  cannotComplete?: boolean;
  reachedSorting?: boolean;
};

type FullTransaction = Transaction & {
  citizenMinistry?: string | null;
  citizenDepartment?: string | null;
  citizenOrganization?: string | null;
  formationName?: string | null;
  subDeptName?: string | null;
  officeName?: string | null;
  followUpUrl?: string | null;
};

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

function getWorkflowStatus(t: Transaction): { label: string; className: string } {
  if (t.status === "DONE")
    return { label: "منجزة", className: "bg-[#1E6B3A]/10 text-[#1E6B3A]" };
  if (t.status === "OVERDUE")
    return { label: "متأخرة", className: "bg-red-100 text-red-700" };
  if (t.cannotComplete)
    return { label: "لا يمكن الانجاز", className: "bg-slate-200 text-slate-700" };
  if (t.delegateName)
    return { label: "إلى مخول", className: "bg-[#1E6B3A]/20 text-[#1E6B3A]" };
  if (t.urgent)
    return { label: "عاجل — قسم المتابعة", className: "bg-[#5B7C99]/20 text-[#5B7C99]" };
  if (t.reachedSorting)
    return { label: "قسم الفرز", className: "bg-[#7C3AED]/20 text-[#7C3AED]" };
  return { label: "قيد التنفيذ", className: "bg-amber-100 text-amber-700" };
}

export default function AdminCitizensPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, done: 0, overdue: 0, total: 0 });
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/transactions?limit=200");
      if (res.ok) {
        const { transactions: trans } = await res.json();
        setTransactions(trans || []);
        const pending = trans.filter((t: Transaction) => t.status === "PENDING").length;
        const done = trans.filter((t: Transaction) => t.status === "DONE").length;
        const overdue = trans.filter((t: Transaction) => t.status === "OVERDUE").length;
        setStatusCounts({
          pending,
          done,
          overdue,
          total: trans.length,
        });
      } else {
        setTransactions([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredTransactions = transactions.filter((t) => {
    if (searchLower) {
      const name = (t.citizenName || "").toLowerCase();
      const phone = (t.citizenPhone || "").replace(/\s/g, "");
      const serial = (t.serialNumber || "").toLowerCase();
      const type = (t.transactionType || t.type || "").toLowerCase();
      const q = searchLower.replace(/\s/g, "");
      const matchesSearch =
        name.includes(searchLower) ||
        phone.includes(q) ||
        serial.includes(searchLower) ||
        type.includes(searchLower);
      if (!matchesSearch) return false;
    }
    const subDate = t.submissionDate || t.createdAt;
    if (dateFrom && subDate) {
      const d = subDate.slice(0, 10);
      if (d < dateFrom) return false;
    }
    if (dateTo && subDate) {
      const d = subDate.slice(0, 10);
      if (d > dateTo) return false;
    }
    return true;
  });

  const citizenTotals = transactions.reduce((acc, t) => {
    const name = (t.citizenName || "—").trim() || "—";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleView = useCallback(async (t: Transaction) => {
    try {
      const res = await fetch(`/api/admin/transactions/${t.id}`);
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

  const handleAddSuccess = useCallback(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">شؤون المواطنين</h1>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="rounded-xl border border-[#1E6B3A] bg-[#1E6B3A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#175a2e]"
        >
          إضافة معاملة
        </button>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
          <h2 className="text-base font-semibold text-[#1B1B1B]">حالة المتابعة</h2>
          <p className="mt-0.5 text-sm text-[#5a5a5a]">ملخص إحصائي لحالة المعاملات في المكتب</p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#5B7C99] bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-[#5a5a5a]">إجمالي المعاملات</p>
            <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{loading ? "—" : statusCounts.total}</p>
          </div>
          <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#B08D57] bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-[#5a5a5a]">قيد التنفيذ</p>
            <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{loading ? "—" : statusCounts.pending}</p>
          </div>
          <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-[#5a5a5a]">منجزة</p>
            <p className="mt-2 text-2xl font-bold text-[#1E6B3A]">{loading ? "—" : statusCounts.done}</p>
          </div>
          <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#b91c1c] bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-[#5a5a5a]">متأخرة</p>
            <p className="mt-2 text-2xl font-bold text-[#b91c1c]">{loading ? "—" : statusCounts.overdue}</p>
          </div>
        </div>
      </article>

      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1B1B1B]">جدول المعاملات — شؤون المواطنين</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">جميع المعاملات المسجلة مع حالة كل معاملة</p>
          <div className="mt-4">
            <label htmlFor="admin-search" className="mb-2 block text-sm font-medium text-[#1B1B1B]">
              بحث وفلترة
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <input
                id="admin-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، الهاتف، الرقم التسلسلي، أو نوع المعاملة"
                className="min-w-[200px] flex-1 rounded-lg border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm text-[#1B1B1B] placeholder:text-[#8a8a8a] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]"
                aria-label="بحث في المعاملات"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="date-from" className="text-sm font-medium text-[#5a5a5a]">من تاريخ</label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-[#d4cfc8] bg-white px-3 py-2.5 text-sm text-[#1B1B1B] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]"
                  aria-label="من تاريخ المعاملة"
                />
                <label htmlFor="date-to" className="text-sm font-medium text-[#5a5a5a]">إلى تاريخ</label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-[#d4cfc8] bg-white px-3 py-2.5 text-sm text-[#1B1B1B] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]"
                  aria-label="إلى تاريخ المعاملة"
                />
              </div>
              <span className="flex items-center rounded-lg border border-[#d4cfc8] bg-white px-3 py-2.5 text-sm text-[#5a5a5a]">
                {filteredTransactions.length} معاملة
              </span>
            </div>
          </div>
        </div>
        {loading ? (
          <p className="py-12 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : transactions.length === 0 ? (
          <p className="py-12 text-center text-[#5a5a5a]">لا توجد معاملات مسجلة.</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="py-12 text-center text-[#5a5a5a]">لا توجد نتائج مطابقة لمعايير البحث.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead>
                <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">رقم المعاملة</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">اسم المواطن</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">إجمالي المعاملات</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">تاريخ تقديم المعاملة</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">حالة المعاملة</th>
                  <th className="py-3 px-3 font-medium text-[#5a5a5a]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => {
                  const name = (t.citizenName || "—").trim() || "—";
                  const total = citizenTotals[name] ?? 1;
                  const status = getWorkflowStatus(t);
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-[#d4cfc8]/80 transition hover:bg-[#f6f3ed]/50"
                    >
                      <td className="border-l border-[#d4cfc8]/60 py-3 px-3 font-mono text-sm text-[#1B1B1B]">
                        {t.serialNumber || "—"}
                      </td>
                      <td className="border-l border-[#d4cfc8]/60 py-3 px-3 font-medium text-[#1B1B1B]">
                        {name}
                      </td>
                      <td className="border-l border-[#d4cfc8]/60 py-3 px-3 text-[#1B1B1B]">
                        {total}
                      </td>
                      <td className="border-l border-[#d4cfc8]/60 py-3 px-3 text-[#1B1B1B]">
                        {formatDate(t.submissionDate)}
                      </td>
                      <td className="border-l border-[#d4cfc8]/60 py-3 px-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleView(t)}
                          className="rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-2 py-1 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                        >
                          عرض المعاملة
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

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

      <AddTransactionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
