"use client";

import { useState, useCallback, useEffect } from "react";
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
  transactionTitle: string | null;
  serialNumber: string | null;
  submissionDate: string | null;
  createdAt: string;
  completedAt: string | null;
  delegateName: string | null;
  reachedSorting?: boolean;
  urgent?: boolean;
  cannotComplete?: boolean;
  formationName: string | null;
};

type FullTransaction = Transaction & {
  citizenIsEmployee?: boolean | null;
  citizenEmployeeSector?: string | null;
  citizenMinistry?: string | null;
  citizenDepartment?: string | null;
  citizenOrganization?: string | null;
  officeName?: string | null;
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
  if (t.status === "DONE")
    return { label: "منجزة", className: "bg-[#1E6B3A]/10 text-[#1E6B3A]" };
  if (t.status === "OVERDUE")
    return { label: "متأخرة", className: "bg-red-100 text-red-700" };
  if (t.status === "REJECTED")
    return { label: "مرفوضة", className: "bg-red-100 text-red-700" };
  if (t.cannotComplete)
    return { label: "لا يمكن الإنجاز", className: "bg-slate-200 text-slate-700" };
  if (t.delegateName)
    return { label: "إلى مخول", className: "bg-[#1E6B3A]/20 text-[#1E6B3A]" };
  if (t.urgent)
    return { label: "وصلت قسم المتابعة", className: "bg-[#5B7C99]/20 text-[#5B7C99]" };
  if (t.reachedSorting)
    return { label: "وصلت قسم الفرز", className: "bg-[#7C3AED]/20 text-[#7C3AED]" };
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

export default function ReceptionTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const statusCounts = {
    total: transactions.length,
    pending: transactions.filter((t) => t.status === "PENDING").length,
    done: transactions.filter((t) => t.status === "DONE").length,
    overdue: transactions.filter((t) => t.status === "OVERDUE").length,
    rejected: transactions.filter((t) => t.status === "REJECTED").length,
  };

  const filteredTransactions = transactions.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (t.citizenName || "").toLowerCase();
      const serial = (t.serialNumber || "").toLowerCase();
      const phone = (t.citizenPhone || "").replace(/\s/g, "");
      const type = (t.transactionType || t.type || "").toLowerCase();
      const title = (t.transactionTitle || "").toLowerCase();
      const qClean = q.replace(/\s/g, "");
      if (
        !name.includes(q) &&
        !serial.includes(q) &&
        !phone.includes(qClean) &&
        !type.includes(q) &&
        !title.includes(q)
      )
        return false;
    }
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions?limit=300", { credentials: "include" });
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
        setViewTransaction(data);
        setTimeout(() => {
          const content = document.getElementById("receipt-content");
          if (content) {
            const printWindow = window.open("", "_blank");
            if (printWindow) {
              printWindow.document.write(`
                <!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>وصل المعاملة</title>
                <style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial;font-size:13px;padding:16px;line-height:1.5}
                .receipt-wrap h3{font-size:15px;margin:12px 0 8px;padding-bottom:8px;border-bottom:2px solid #d4cfc8}
                table{width:100%;border-collapse:collapse}td{padding:10px 12px;border-bottom:1px solid #eee}
                .receipt-wrap svg{width:140px!important;height:140px!important}</style></head>
                <body><div class="receipt-wrap">${content.innerHTML}</div></body></html>`);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => {
                printWindow.print();
                printWindow.close();
              }, 250);
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
      {/* رأس الصفحة */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#d4cfc8] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B1B1B]">المعاملات</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            المعاملات المضافة من شؤون المواطنين — عرض، طباعة، ومتابعة
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/reception/citizens"
            className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] shadow-sm transition-colors hover:bg-[#f6f3ed]"
          >
            شؤون المواطنين
          </Link>
          <Link
            href="/reception/reports"
            className="flex items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] shadow-sm transition-colors hover:bg-[#f6f3ed]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            تقارير وإحصائيات
          </Link>
          <Link
            href="/reception/citizens/new"
            className="flex items-center gap-2 rounded-xl border border-[#1E6B3A] bg-[#1E6B3A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#175a2e]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            معاملة جديدة
          </Link>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
          <h2 className="text-base font-semibold text-[#1B1B1B]">ملخص حالة المعاملات</h2>
          <p className="mt-0.5 text-sm text-[#5a5a5a]">إحصائيات المعاملات في المكتب</p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
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
          <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#6b7280] bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-[#5a5a5a]">مرفوضة</p>
            <p className="mt-2 text-2xl font-bold text-[#6b7280]">{loading ? "—" : statusCounts.rejected}</p>
          </div>
        </div>
      </article>

      {/* شريط البحث والفلترة */}
      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
          <h2 className="text-base font-semibold text-[#1B1B1B]">بحث وفلترة</h2>
          <p className="mt-0.5 text-sm text-[#5a5a5a]">استعلام المعاملات حسب المعايير</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 p-6">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-[#5a5a5a]">بحث</label>
            <input
              type="search"
              placeholder="بحث بالاسم، رقم المعاملة، الهاتف، أو النوع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2 text-sm text-[#1B1B1B] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]/30"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="mb-1 block text-xs font-medium text-[#5a5a5a]">الحالة</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2 text-sm text-[#1B1B1B] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]/30"
            >
              <option value="">الكل</option>
              <option value="PENDING">قيد التنفيذ</option>
              <option value="DONE">منجزة</option>
              <option value="OVERDUE">متأخرة</option>
              <option value="REJECTED">مرفوضة</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[#d4cfc8] bg-[#f6f3ed]/50 p-2">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded-lg px-3 py-2 transition ${viewMode === "cards" ? "bg-white text-[#1E6B3A] shadow-sm" : "text-[#5a5a5a] hover:bg-white/50"}`}
              title="عرض البطاقات"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-lg px-3 py-2 transition ${viewMode === "table" ? "bg-white text-[#1E6B3A] shadow-sm" : "text-[#5a5a5a] hover:bg-white/50"}`}
              title="عرض الجدول"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </article>

      {/* المحتوى */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1E6B3A] border-t-transparent" />
        </div>
      ) : transactions.length === 0 ? (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white p-12 text-center shadow-sm">
          <p className="text-[#5a5a5a]">لا توجد معاملات مسجلة.</p>
          <Link
            href="/reception/citizens/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#1E6B3A] bg-[#1E6B3A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#175a2e]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة معاملة جديدة
          </Link>
        </article>
      ) : filteredTransactions.length === 0 ? (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white p-12 text-center shadow-sm">
          <p className="text-[#5a5a5a]">لا توجد نتائج تطابق معايير البحث والفلترة.</p>
        </article>
      ) : viewMode === "table" ? (
        /* عرض الجدول */
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
            <h2 className="text-base font-semibold text-[#1B1B1B]">جدول المعاملات</h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">عرض {filteredTransactions.length} معاملة</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-right text-sm">
              <thead>
                <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">رقم المعاملة</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">المواطن</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">الهاتف</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">نوع المعاملة</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">التشكيل</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">تاريخ التقديم</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">الحالة</th>
                  <th className="py-3 px-3 font-medium text-[#5a5a5a]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => {
                  const s = getStatusDisplay(t);
                  return (
                    <tr key={t.id} className="border-b border-[#d4cfc8]/80 transition hover:bg-[#f6f3ed]/50">
                      <td className="border-l border-[#d4cfc8]/60 py-3 px-3 font-mono font-medium text-[#1E6B3A]">
                        {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                      </td>
                      <td className="border-l border-[#d4cfc8]/60 py-3 px-3 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                      <td className="border-l border-[#d4cfc8]/60 py-3 px-3 text-[#5a5a5a]" dir="ltr">{t.citizenPhone || "—"}</td>
                      <td className="max-w-[140px] truncate border-l border-[#d4cfc8]/60 py-3 px-3 text-[#1B1B1B]" title={t.transactionTitle || undefined}>
                        {t.transactionType || t.type || "—"}
                      </td>
                      <td className="max-w-[120px] truncate border-l border-[#d4cfc8]/60 py-3 px-3 text-[#5a5a5a]">{t.formationName || "—"}</td>
                      <td className="border-l border-[#d4cfc8]/60 py-3 px-3 text-[#5a5a5a]">{formatDate(t.submissionDate || t.createdAt)}</td>
                      <td className="border-l border-[#d4cfc8]/60 py-3 px-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(t)}
                            className="rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-2 py-1 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                          >
                            عرض
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(t)}
                            className="rounded-lg border border-[#B08D57]/50 bg-[#f6f3ed] px-2 py-1 text-xs font-medium text-[#5a5a5a] hover:bg-[#f0ebe2]"
                          >
                            طباعة
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      ) : (
        /* عرض البطاقات */
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
            <h2 className="text-base font-semibold text-[#1B1B1B]">المعاملات</h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">عرض {filteredTransactions.length} معاملة</p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTransactions.map((t) => {
              const s = getStatusDisplay(t);
              return (
                <div
                  key={t.id}
                  className="relative flex flex-col overflow-hidden rounded-xl border border-[#d4cfc8] bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-[#1E6B3A]" dir="ltr">
                        {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="truncate font-semibold text-[#1B1B1B]">{t.citizenName || "—"}</h3>
                    <p className="mt-1 text-sm text-[#5a5a5a]" dir="ltr">{t.citizenPhone || "—"}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-[#1B1B1B]">{t.transactionType || t.type || "—"}</p>
                    {t.transactionTitle && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-[#5a5a5a]" title={t.transactionTitle}>
                        {t.transactionTitle}
                      </p>
                    )}
                    {t.formationName && (
                      <p className="mt-0.5 text-xs text-[#5a5a5a]">التشكيل: {t.formationName}</p>
                    )}
                    <p className="mt-2 text-xs text-[#5a5a5a]">تاريخ التقديم: {formatDate(t.submissionDate || t.createdAt)}</p>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d4cfc8] pt-4">
                      <button
                        type="button"
                        onClick={() => handleView(t)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-3 py-2 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        عرض
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrint(t)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2 text-xs font-medium text-[#5a5a5a] hover:bg-[#f0ebe2]"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4-1v8m0 0V5a2 2 0 012-2h6a2 2 0 012 2v8" />
                        </svg>
                        طباعة
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      )}

      {/* مودال عرض الوصل */}
      {viewTransaction && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewTransaction(null)} aria-hidden />
          <div className="relative mx-auto mt-8 mb-16 w-full max-w-2xl rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">عرض وصل المعاملة</h3>
              <button
                type="button"
                onClick={() => setViewTransaction(null)}
                className="rounded-lg p-2 text-[#5a5a5a] hover:bg-[#f6f3ed]"
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
