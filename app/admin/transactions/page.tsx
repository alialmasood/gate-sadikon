"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { broadcastDataUpdate } from "@/lib/broadcast-data-update";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";

type Transaction = {
  id: string;
  citizenName: string | null;
  status: string;
  type: string | null;
  createdAt: string;
  completedAt: string | null;
  delegateName: string | null;
  serialNumber?: string | null;
  submissionDate?: string | null;
  transactionType?: string | null;
};

type FullTransaction = Transaction & {
  citizenPhone?: string | null;
  citizenAddress?: string | null;
  citizenIsEmployee?: boolean | null;
  citizenEmployeeSector?: string | null;
  citizenMinistry?: string | null;
  citizenDepartment?: string | null;
  citizenOrganization?: string | null;
  transactionType?: string | null;
  transactionTitle?: string | null;
  serialNumber?: string | null;
  submissionDate?: string | null;
  officeName?: string | null;
  formationId?: string | null;
  formationName?: string | null;
  subDeptId?: string | null;
  subDeptName?: string | null;
  followUpUrl?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
};

const BORDER_RADIUS = "rounded-xl";
const INPUT_CLASS =
  "w-full rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25";

function formatDate(s: string) {
  return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "short", timeStyle: "short", numberingSystem: "arab" }).format(new Date(s));
}

function getEmployeeInfo(t: FullTransaction): string {
  if (t.citizenIsEmployee !== true) return "—";
  const sectors: Record<string, string> = {
    GOVERNMENT: "حكومي",
    PRIVATE: "قطاع خاص",
    MIXED: "قطاع مشترك",
    NOT_LINKED: "جهة غير مرتبطة",
    OTHER: "أخرى",
  };
  const sector = sectors[t.citizenEmployeeSector || ""] || t.citizenEmployeeSector || "";
  if (!sector) return "موظف";
  if (t.citizenEmployeeSector === "GOVERNMENT") {
    const parts = [t.citizenMinistry, t.citizenDepartment].filter(Boolean);
    return parts.length ? `${sector} (${parts.join(" / ")})` : sector;
  }
  return t.citizenOrganization ? `${sector} (${t.citizenOrganization})` : sector;
}

function formatDateShort(s: string | null): string {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "short", numberingSystem: "arab" }).format(new Date(s));
  } catch {
    return s;
  }
}

function escapeCsvCell(val: string): string {
  const s = String(val ?? "").trim();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadTransactionsCsv(list: Transaction[]) {
  const headers = ["رقم المعاملة", "اسم المواطن", "الحالة", "المخول", "تاريخ الإنشاء", "تاريخ التقديم", "نوع المعاملة"];
  const rows = list.map((t) => [
    escapeCsvCell(t.serialNumber ?? ""),
    escapeCsvCell(t.citizenName ?? ""),
    escapeCsvCell(STATUS_LABELS[t.status] ?? t.status),
    escapeCsvCell(t.delegateName ?? ""),
    escapeCsvCell(t.createdAt ? formatDateShort(t.createdAt) : ""),
    escapeCsvCell(t.submissionDate ? formatDateShort(t.submissionDate) : ""),
    escapeCsvCell(t.transactionType ?? t.type ?? ""),
  ]);
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `معاملات-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [newCitizenName, setNewCitizenName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [expandedRowData, setExpandedRowData] = useState<FullTransaction | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/admin/transactions?status=${statusFilter}&limit=200` : "/api/admin/transactions?limit=200";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setOverdueCount(data.overdueCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTransactions = useMemo(() => {
    let list = transactions;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const name = (t.citizenName || "").toLowerCase();
        const delegate = (t.delegateName || "").toLowerCase();
        return name.includes(q) || delegate.includes(q);
      });
    }
    if (dateFrom || dateTo) {
      list = list.filter((t) => {
        const d = (t.createdAt || "").slice(0, 10);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
    }
    return list;
  }, [transactions, searchQuery, dateFrom, dateTo]);

  const statusCounts = useMemo(() => {
    const pending = transactions.filter((t) => t.status === "PENDING").length;
    const done = transactions.filter((t) => t.status === "DONE").length;
    const overdue = transactions.filter((t) => t.status === "OVERDUE").length;
    return {
      total: transactions.length,
      pending,
      done,
      overdue,
    };
  }, [transactions]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citizenName: newCitizenName.trim() || null }),
      });
      if (res.ok) {
        const t = await res.json();
        setTransactions((prev) => [t, ...prev]);
        setModalOpen(false);
        setNewCitizenName("");
        broadcastDataUpdate();
      } else {
        const body = await res.json();
        alert(body.error || "فشل الإضافة");
      }
    } catch {
      alert("حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
        loadData();
        broadcastDataUpdate();
      } else {
        const body = await res.json();
        alert(body.error || "فشل التحديث");
      }
    } catch {
      alert("حدث خطأ غير متوقع");
    } finally {
      setUpdatingId(null);
    }
  };

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

  const toggleExpandRow = useCallback(async (t: Transaction) => {
    if (expandedRowId === t.id) {
      setExpandedRowId(null);
      setExpandedRowData(null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/transactions/${t.id}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedRowId(t.id);
        setExpandedRowData(data);
      } else {
        alert("فشل تحميل تفاصيل المعاملة");
      }
    } catch {
      alert("حدث خطأ غير متوقع");
    }
  }, [expandedRowId]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleteConfirming(true);
    try {
      const res = await fetch(`/api/admin/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        setDeleteId(null);
        loadData();
        broadcastDataUpdate();
      } else {
        const body = await res.json();
        alert(body.error || "فشل الحذف");
      }
    } catch {
      alert("حدث خطأ غير متوقع");
    } finally {
      setDeleteConfirming(false);
      setDeleteId(null);
    }
  }, [loadData]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* موبايل فقط: تنسيق رسمي */}
        <div className="w-full rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-[#f6f3ed]/60 px-4 py-3 shadow-sm md:hidden">
          <h1 className="text-lg font-bold text-[#1B1B1B]">إدارة المعاملات</h1>
          <p className="mt-0.5 text-xs text-[#5a5a5a]">عرض وإدارة جميع المعاملات وتصفيتها حسب الحالة</p>
        </div>
        {/* اللابتوب: العنوان الأصلي */}
        <h1 className="hidden text-2xl font-bold text-[#1B1B1B] md:block">إدارة المعاملات</h1>
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          {/* موبايل فقط: فلترة الحالة بتنسيق رسمي */}
          <div className="w-full rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-[#f6f3ed]/60 px-4 py-3 shadow-sm md:hidden">
            <label htmlFor="status-filter-mobile" className="mb-2 block text-sm font-medium text-[#1B1B1B]">فلترة حسب الحالة</label>
            <select
              id="status-filter-mobile"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-[#d4cfc8] bg-white px-3 py-2.5 text-sm text-[#1B1B1B] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]"
              aria-label="فلترة حسب الحالة"
            >
              <option value="">جميع الحالات</option>
              <option value="PENDING">قيد التنفيذ</option>
              <option value="DONE">منجزة</option>
              <option value="OVERDUE">متأخرة</option>
            </select>
          </div>
          {/* اللابتوب: القائمة كما هي */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`hidden ${BORDER_RADIUS} border border-[#d4cfc8] bg-white px-3 py-2.5 text-sm text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none md:block`}
            aria-label="فلترة حسب الحالة"
          >
            <option value="">جميع الحالات</option>
            <option value="PENDING">قيد التنفيذ</option>
            <option value="DONE">منجزة</option>
            <option value="OVERDUE">متأخرة</option>
          </select>
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className={`${BORDER_RADIUS} flex items-center justify-center gap-2 border border-[#d4cfc8] bg-white px-3 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed] disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto`}
            aria-label="تحديث البيانات"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث البيانات
          </button>
          <button
            type="button"
            onClick={() => downloadTransactionsCsv(filteredTransactions)}
            disabled={loading || filteredTransactions.length === 0}
            className={`${BORDER_RADIUS} border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-3 py-2.5 text-sm font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto`}
          >
            تصدير CSV
          </button>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <span className="font-medium">تنبيه: </span>
          لديك {overdueCount} معاملة متأخرة
        </div>
      )}

      {/* موبايل فقط: إحصائيات المعاملات */}
      <div className="space-y-0 md:hidden">
        <div className="rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-[#f6f3ed]/60 px-4 py-3 shadow-sm">
          <h2 className="text-base font-semibold text-[#1B1B1B]">إحصائيات المعاملات</h2>
          <p className="mt-0.5 text-xs text-[#5a5a5a]">ملخص الحالات من المعاملات المحمّلة</p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
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
      </div>

      {/* موبايل فقط: بحث وفلترة بالتاريخ */}
      <div className="rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-[#f6f3ed]/60 px-4 py-3 shadow-sm md:hidden">
        <p className="mb-3 text-sm font-medium text-[#1B1B1B]">بحث وفلترة</p>
        <div className="flex flex-col gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="اسم المواطن أو المخول…"
            className="w-full rounded-lg border border-[#d4cfc8] bg-white px-3 py-2 text-sm text-[#1B1B1B] placeholder:text-[#8a8a8a] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]"
            aria-label="بحث بالاسم أو المخول"
          />
          <div className="flex w-full items-center gap-2">
            <label htmlFor="tx-date-from" className="shrink-0 text-xs font-medium text-[#5a5a5a]">من</label>
            <input
              id="tx-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-[#d4cfc8] bg-white px-2 py-2 text-xs text-[#1B1B1B] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]"
              aria-label="من تاريخ"
            />
            <label htmlFor="tx-date-to" className="shrink-0 text-xs font-medium text-[#5a5a5a]">إلى</label>
            <input
              id="tx-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-[#d4cfc8] bg-white px-2 py-2 text-xs text-[#1B1B1B] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]"
              aria-label="إلى تاريخ"
            />
          </div>
          <span className="text-xs text-[#5a5a5a]">
            عدد المعاملات المسجلة <strong className="font-bold text-[#1E6B3A]">{filteredTransactions.length}</strong> معاملة
          </span>
        </div>
      </div>

      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        {/* موبايل فقط: عنوان رسمي لجدول المعاملات */}
        <div className="mb-4 rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-[#f6f3ed]/60 px-4 py-3 shadow-sm md:hidden">
          <h2 className="text-base font-semibold text-[#1B1B1B]">جدول المعاملات</h2>
          <p className="mt-0.5 text-xs text-[#5a5a5a]">قائمة المعاملات مع إمكانية عرض التفاصيل والإجراءات</p>
        </div>
        {loading ? (
          <p className="py-12 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : transactions.length === 0 ? (
          <p className="py-12 text-center text-[#5a5a5a]">لا توجد معاملات.</p>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[#5a5a5a]">لا توجد معاملات تطابق البحث أو الفلترة.</p>
            <p className="mt-1 text-sm text-[#5a5a5a]">جرّب تغيير كلمات البحث أو نطاق التاريخ.</p>
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setDateFrom(""); setDateTo(""); }}
              className="mt-4 rounded-xl border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-4 py-2.5 text-sm font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
            >
              مسح البحث والفلترة
            </button>
          </div>
        ) : (
          <>
            {/* موبايل فقط: قائمة قابلة للتوسيع بتنسيق رسمي */}
            <div className="space-y-0 divide-y divide-[#d4cfc8]/40 md:hidden" dir="rtl">
              {filteredTransactions.map((t, idx) => {
                const isExpanded = expandedRowId === t.id;
                const isEven = idx % 2 === 0;
                const name = (t.citizenName || "—").trim() || "—";
                return (
                  <div
                    key={t.id}
                    className={`rounded-none border-[#d4cfc8]/30 ${isEven ? "bg-[#f6f3ed]/30" : "bg-white"} border-b last:border-b-0`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpandRow(t)}
                      className="flex w-full items-center justify-between gap-2 py-3 px-1 text-right"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="w-6 shrink-0 text-center text-sm font-medium text-[#5a5a5a]">{(idx + 1).toLocaleString("ar-EG")}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-[#1B1B1B]">{name}</span>
                        <span className="w-16 shrink-0 truncate font-mono text-xs text-[#5a5a5a]">{t.serialNumber || "—"}</span>
                      </div>
                      <span className={`shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden>
                        <svg className="h-5 w-5 text-[#5a5a5a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>
                    {isExpanded && expandedRowData && expandedRowData.id === t.id && (
                      <div className="border-t border-[#d4cfc8]/50 bg-[#FAFAF9] w-full px-4 py-3">
                        <dl className="text-sm">
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3 first:pt-0">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">رقم المعاملة</dt>
                            <dd className="min-w-0 flex-1 truncate text-left font-mono text-[#1B1B1B]">{expandedRowData.serialNumber || "—"}</dd>
                          </div>
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">اسم المواطن</dt>
                            <dd className="min-w-0 flex-1 truncate text-left text-[#1B1B1B]">{(expandedRowData.citizenName || "—").trim() || "—"}</dd>
                          </div>
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">الحالة</dt>
                            <dd>
                              <span
                                className={`font-medium ${t.status === "DONE" ? "text-[#1E6B3A]" : t.status === "OVERDUE" ? "text-red-600" : "text-amber-600"}`}
                              >
                                {STATUS_LABELS[t.status] ?? t.status}
                              </span>
                            </dd>
                          </div>
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">المخول</dt>
                            <dd className="min-w-0 flex-1 truncate text-left text-[#1B1B1B]">{expandedRowData.delegateName || "—"}</dd>
                          </div>
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">تاريخ الإنشاء</dt>
                            <dd className="min-w-0 flex-1 text-left text-[#1B1B1B]">{formatDate(expandedRowData.createdAt)}</dd>
                          </div>
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">نوع المعاملة</dt>
                            <dd className="min-w-0 flex-1 truncate text-left text-[#1B1B1B]">{expandedRowData.transactionType || expandedRowData.type || "—"}</dd>
                          </div>
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">الجهة</dt>
                            <dd className="min-w-0 flex-1 truncate text-left text-[#1B1B1B]">{expandedRowData.formationName ?? expandedRowData.officeName ?? "—"}</dd>
                          </div>
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">تاريخ التقديم</dt>
                            <dd className="min-w-0 flex-1 text-left text-[#1B1B1B]">{formatDateShort(expandedRowData.submissionDate ?? null)}</dd>
                          </div>
                        </dl>
                        <div className="flex w-full gap-2 border-t border-[#d4cfc8]/50 pt-4">
                          <button
                            type="button"
                            onClick={() => handleView(t)}
                            className="min-w-0 flex-1 rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-3 py-2.5 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                          >
                            عرض
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(t.id)}
                            className="min-w-0 flex-1 rounded-lg border border-red-500/50 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-100"
                          >
                            حذف
                          </button>
                          {t.status !== "DONE" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(t.id, "DONE")}
                              disabled={updatingId === t.id}
                              className="min-w-0 flex-1 rounded-lg border border-[#0D9488]/50 bg-[#0D9488]/10 px-3 py-2.5 text-xs font-medium text-[#0f766e] hover:bg-[#0D9488]/20 disabled:opacity-60"
                            >
                              {updatingId === t.id ? "…" : "تسجيل إنجاز"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* ديسكتوب: الجدول الأصلي */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[700px] text-right">
                <thead>
                  <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                    <th className="py-3 pr-2">اسم المواطن</th>
                    <th className="py-3 pr-2">الحالة</th>
                    <th className="py-3 pr-2">المخول</th>
                    <th className="py-3 pr-2">تاريخ الإنشاء</th>
                    <th className="py-3 pl-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-[#d4cfc8]/80 last:border-0">
                      <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                      <td className="py-3 pr-2">
                        <span
                          className={`font-medium ${
                            t.status === "DONE" ? "text-[#1E6B3A]" : t.status === "OVERDUE" ? "text-red-600" : "text-amber-600"
                          }`}
                        >
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-[#5a5a5a]">{t.delegateName || "—"}</td>
                      <td className="py-3 pr-2 text-sm text-[#5a5a5a]">{formatDate(t.createdAt)}</td>
                      <td className="py-3 pl-2">
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
                            onClick={() => setDeleteId(t.id)}
                            className="rounded-lg border border-red-500/50 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                          >
                            حذف
                          </button>
                          {t.status !== "DONE" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(t.id, "DONE")}
                              disabled={updatingId === t.id}
                              className="rounded-lg border border-[#0D9488]/50 bg-[#0D9488]/10 px-2 py-1 text-xs font-medium text-[#0f766e] hover:bg-[#0D9488]/20 disabled:opacity-60"
                            >
                              {updatingId === t.id ? "…" : "تسجيل إنجاز"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#1B1B1B]">إضافة معاملة جديدة</h3>
            <form onSubmit={handleAddTransaction} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">اسم المواطن</label>
                <input
                  type="text"
                  value={newCitizenName}
                  onChange={(e) => setNewCitizenName(e.target.value)}
                  placeholder="الاسم الكامل للمواطن"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={`flex-1 ${BORDER_RADIUS} border border-[#d4cfc8] px-4 py-2.5 font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 ${BORDER_RADIUS} bg-[#1E6B3A] px-4 py-2.5 font-medium text-white hover:bg-[#175a2e] disabled:opacity-60`}
                >
                  {submitting ? "جاري الإضافة…" : "إضافة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewTransaction && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewTransaction(null)} aria-hidden />
          <div className="relative mx-auto mt-8 mb-16 w-full max-w-2xl rounded-2xl border border-[#d4cfc8] bg-[#FAFAF9] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">عرض وصل المعاملة</h3>
              <button type="button" onClick={() => setViewTransaction(null)} className="rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200" aria-label="إغلاق">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleteConfirming && setDeleteId(null)} aria-hidden />
          <div className="relative rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#1B1B1B]">تأكيد الحذف</h3>
            <p className="mt-2 text-sm text-[#5a5a5a]">هل أنت متأكد من حذف هذه المعاملة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDeleteId(null)} disabled={deleteConfirming} className={`flex-1 ${BORDER_RADIUS} border border-[#d4cfc8] px-4 py-2.5 font-medium hover:bg-[#f6f3ed] disabled:opacity-60`}>إلغاء</button>
              <button type="button" onClick={() => handleDelete(deleteId)} disabled={deleteConfirming} className={`flex-1 ${BORDER_RADIUS} bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700 disabled:opacity-60`}>{deleteConfirming ? "جاري الحذف…" : "حذف"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
