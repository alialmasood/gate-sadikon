"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
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
  completedByAdmin?: boolean;
  reachedSorting?: boolean;
  formationName?: string | null;
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

const FILTER_OPTIONS = [
  { value: "", label: "جميع الحالات" },
  { value: "received", label: "قيد الفرز (مستلمة)" },
  { value: "urgent", label: "عاجل" },
  { value: "delegated", label: "محوّلة لمخول" },
  { value: "cannotComplete", label: "تعذر إنجازها" },
  { value: "DONE", label: "منجزة" },
  { value: "OVERDUE", label: "متأخرة" },
];

export default function SortingTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions?limit=500", { credentials: "include" });
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

  const stats = useMemo(() => ({
    total: transactions.length,
    pending: transactions.filter((t) => !t.urgent && !t.cannotComplete && !t.delegateName && !t.completedByAdmin && t.status !== "DONE").length,
    done: transactions.filter((t) => t.status === "DONE" || t.completedByAdmin).length,
    overdue: transactions.filter((t) => t.status === "OVERDUE").length,
    urgent: transactions.filter((t) => t.urgent).length,
    delegated: transactions.filter((t) => t.delegateName).length,
    cannotComplete: transactions.filter((t) => t.cannotComplete).length,
  }), [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const name = (t.citizenName || "").toLowerCase();
        const serial = (t.serialNumber || "").toLowerCase();
        const phone = (t.citizenPhone || "").replace(/\s/g, "");
        const type = (t.transactionType || t.type || "").toLowerCase();
        const formation = (t.formationName || "").toLowerCase();
        const qClean = q.replace(/\s/g, "");
        if (
          !name.includes(q) &&
          !serial.includes(q) &&
          !phone.includes(qClean) &&
          !type.includes(q) &&
          !formation.includes(q)
        )
          return false;
      }
      if (filterStatus === "received") {
        if (t.urgent || t.cannotComplete || t.delegateName || t.completedByAdmin || t.status === "DONE") return false;
      } else if (filterStatus === "urgent" && !t.urgent) return false;
      else if (filterStatus === "delegated" && !t.delegateName) return false;
      else if (filterStatus === "cannotComplete" && !t.cannotComplete) return false;
      else if (filterStatus === "DONE" && t.status !== "DONE" && !t.completedByAdmin) return false;
      else if (filterStatus === "OVERDUE" && t.status !== "OVERDUE") return false;
      return true;
    });
  }, [transactions, searchQuery, filterStatus]);

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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B1B1B]">جميع المعاملات</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">
            جميع المعاملات المسجلة — تُحدَّث تلقائياً كل {POLL_INTERVAL_MS / 1000} ثوانٍ
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
      ) : transactions.length === 0 ? (
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center gap-4 p-12">
            <p className="text-[#5a5a5a]">لا توجد معاملات حالياً.</p>
            <Link href="/sorting" className="rounded-xl border border-[#7C3AED]/50 bg-[#7C3AED]/10 px-4 py-2 text-sm font-medium text-[#7C3AED] hover:bg-[#7C3AED]/20">
              العودة للوحة التحكم
            </Link>
          </div>
        </article>
      ) : (
        <>
          {/* بطاقات إحصائية */}
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">ملخص إحصائي</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">توزيع المعاملات حسب الحالة والمسار</p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-7">
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#7C3AED] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">الإجمالي</p>
                <p className="mt-2 text-2xl font-bold text-[#7C3AED]">{stats.total}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#B08D57] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">قيد الفرز</p>
                <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{stats.pending}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">منجزة</p>
                <p className="mt-2 text-2xl font-bold text-[#1E6B3A]">{stats.done}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#b91c1c] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#5a5a5a]">متأخرة</p>
                <p className="mt-2 text-2xl font-bold text-[#b91c1c]">{stats.overdue}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-amber-200 border-r-4 border-r-amber-500 bg-amber-50/50 p-4 shadow-sm">
                <p className="text-sm font-medium text-amber-700">عاجل</p>
                <p className="mt-2 text-2xl font-bold text-amber-700">{stats.urgent}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-slate-200 border-r-4 border-r-slate-500 bg-slate-50/50 p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-700">تعذر إنجازها</p>
                <p className="mt-2 text-2xl font-bold text-slate-700">{stats.cannotComplete}</p>
              </div>
              <div className="flex flex-col rounded-xl border border-[#1E6B3A]/30 border-r-4 border-r-[#1E6B3A] bg-[#ccfbf1]/30 p-4 shadow-sm">
                <p className="text-sm font-medium text-[#0f766e]">محوّلة</p>
                <p className="mt-2 text-2xl font-bold text-[#0f766e]">{stats.delegated}</p>
              </div>
            </div>
          </article>

          {/* بحث وفلترة */}
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-4 p-4">
              <input
                type="search"
                placeholder="بحث (اسم، رقم، هاتف، نوع، تشكيل)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px] rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm text-[#1B1B1B] placeholder:text-[#9a9a9a] focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm text-[#1B1B1B] focus:border-[#7C3AED] focus:outline-none"
              >
                {FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="flex rounded-lg border border-[#d4cfc8] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "table" ? "bg-[#7C3AED] text-white" : "text-[#5a5a5a] hover:bg-[#f6f3ed]"}`}
                  title="عرض جدول"
                >
                  جدول
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "cards" ? "bg-[#7C3AED] text-white" : "text-[#5a5a5a] hover:bg-[#f6f3ed]"}`}
                  title="عرض بطاقات"
                >
                  بطاقات
                </button>
              </div>
              <span className="text-sm text-[#5a5a5a]">
                عرض {filteredTransactions.length} من {transactions.length}
              </span>
            </div>
          </article>

          {/* جدول أو بطاقات */}
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">قائمة المعاملات</h2>
              <p className="mt-0.5 text-sm text-[#5a5a5a]">عرض وتصدير — طباعة وعرض التفاصيل</p>
            </div>
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16">
                <p className="text-[#5a5a5a]">لا توجد نتائج تطابق البحث أو الفلتر.</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setFilterStatus(""); }}
                  className="rounded-xl border border-[#7C3AED]/50 bg-[#7C3AED]/10 px-4 py-2 text-sm font-medium text-[#7C3AED] hover:bg-[#7C3AED]/20"
                >
                  مسح البحث والفلتر
                </button>
              </div>
            ) : viewMode === "table" ? (
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
                {filteredTransactions.map((t) => (
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
                      {t.status === "DONE" || t.completedByAdmin ? (
                        <span className="inline-block rounded-full bg-[#1E6B3A]/10 px-2 py-0.5 text-xs font-medium text-[#1E6B3A]">
                          منجزة
                        </span>
                      ) : t.status === "OVERDUE" ? (
                        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          متأخرة
                        </span>
                      ) : t.cannotComplete ? (
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
                        <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {STATUS_LABELS[t.status] || t.status || "قيد التنفيذ"}
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
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleView(t)}
                          className="rounded-lg border border-[#7C3AED]/50 bg-[#7C3AED]/10 px-2 py-1 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/20"
                        >
                          عرض
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrint(t)}
                          className="rounded-lg border border-[#B08D57]/50 bg-[#B08D57]/10 px-2 py-1 text-xs font-medium text-[#9C7B49] hover:bg-[#B08D57]/20"
                        >
                          طباعة
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            ) : (
              <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-[#d4cfc8] bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-[#7C3AED]" dir="ltr">
                          {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                        </span>
                        {t.status === "DONE" || t.completedByAdmin ? (
                          <span className="rounded-full bg-[#1E6B3A]/10 px-2 py-0.5 text-xs font-medium text-[#1E6B3A]">منجزة</span>
                        ) : t.urgent ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">عاجل</span>
                        ) : t.cannotComplete ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">تعذر إنجازها</span>
                        ) : t.delegateName ? (
                          <span className="rounded-full bg-[#1E6B3A]/20 px-2 py-0.5 text-xs font-medium text-[#1E6B3A]">محوّلة</span>
                        ) : (
                          <span className="rounded-full bg-[#7C3AED]/20 px-2 py-0.5 text-xs font-medium text-[#7C3AED]">قيد الفرز</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="truncate font-semibold text-[#1B1B1B]">{t.citizenName || "—"}</h3>
                      <p className="mt-1 text-sm text-[#5a5a5a]" dir="ltr">{t.citizenPhone || "—"}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-[#5a5a5a]">{t.transactionType || t.type || "—"}</p>
                      <p className="mt-1 text-xs text-[#5a5a5a]">{t.formationName || "—"} · {formatDate(t.createdAt)}</p>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d4cfc8] pt-4">
                        <button
                          type="button"
                          onClick={() => handleView(t)}
                          className="flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/50 bg-[#7C3AED]/10 px-3 py-2 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/20"
                        >
                          عرض
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrint(t)}
                          className="flex items-center gap-1.5 rounded-lg border border-[#B08D57]/50 bg-[#B08D57]/10 px-3 py-2 text-xs font-medium text-[#9C7B49] hover:bg-[#B08D57]/20"
                        >
                          طباعة
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </>
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
