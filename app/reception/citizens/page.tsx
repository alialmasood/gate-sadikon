"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";

type Transaction = {
  id: string;
  citizenName: string | null;
  citizenPhone: string | null;
  citizenAddress: string | null;
  citizenIsEmployee: boolean | null;
  citizenEmployeeSector: string | null;
  citizenMinistry: string | null;
  citizenDepartment: string | null;
  citizenOrganization: string | null;
  status: string;
  type: string | null;
  transactionType: string | null;
  transactionTitle: string | null;
  serialNumber: string | null;
  submissionDate: string | null;
  attachments: unknown;
  createdAt: string;
  completedAt: string | null;
  delegateName: string | null;
  formationId?: string | null;
  subDeptId?: string | null;
  urgent?: boolean;
  cannotComplete?: boolean;
  reachedSorting?: boolean;
};

type FullTransaction = Transaction & {
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

const SECTOR_LABELS: Record<string, string> = {
  GOVERNMENT: "حكومي",
  PRIVATE: "قطاع خاص",
  MIXED: "قطاع مشترك",
  NOT_LINKED: "جهة غير مرتبطة بوزارة",
  OTHER: "جهة أخرى",
};

const TRANSACTION_TYPES = [
  { value: "طلب", label: "طلب" },
  { value: "طلب نقل خدمات بين وزارتين", label: "طلب نقل خدمات بين وزارتين" },
  { value: "نقل خدمات بين تشكيلين في وزارة", label: "نقل خدمات بين تشكيلين في وزارة" },
  { value: "طلب تخصيص قطعة ارض", label: "طلب تخصيص قطعة ارض" },
  { value: "طلب تعيين", label: "طلب تعيين" },
  { value: "طلب تشغيل", label: "طلب تشغيل" },
  { value: "تظلم", label: "تظلم" },
  { value: "مفاتحة", label: "مفاتحة" },
  { value: "طلب رعاية اجتماعية", label: "طلب رعاية اجتماعية" },
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

export default function ReceptionCitizensPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, done: 0, overdue: 0, total: 0 });
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTransactionType, setFilterTransactionType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions?limit=200", { credentials: "include" });
      let data: { transactions?: Transaction[] } = {};
      try {
        const text = await res.text();
        if (text.trim()) data = JSON.parse(text);
      } catch {
        data = { transactions: [] };
      }
      if (res.ok) {
        const trans = data.transactions || [];
        setTransactions(trans);
        const pending = trans.filter((t: Transaction) => t.status === "PENDING").length;
        const done = trans.filter((t: Transaction) => t.status === "DONE").length;
        const overdue = trans.filter((t: Transaction) => t.status === "OVERDUE").length;
        setStatusCounts({ pending, done, overdue, total: trans.length });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const uniqueTypesFromData = Array.from(
    new Set(transactions.map((t) => t.transactionType || t.type).filter(Boolean) as string[])
  ).sort();
  const allTransactionTypes = [
    ...TRANSACTION_TYPES,
    ...uniqueTypesFromData
      .filter((v) => !TRANSACTION_TYPES.some((t) => t.value === v))
      .map((v) => ({ value: v, label: v })),
  ];

  const filteredTransactions = transactions.filter((t) => {
    const typeVal = t.transactionType || t.type || "";
    if (filterTransactionType && typeVal !== filterTransactionType) return false;
    const subDate = t.submissionDate ? new Date(t.submissionDate) : null;
    if (filterDateFrom && subDate && subDate < new Date(filterDateFrom + "T00:00:00")) return false;
    if (filterDateTo && subDate && subDate > new Date(filterDateTo + "T23:59:59")) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (t.citizenName || "").toLowerCase();
      const serial = (t.serialNumber || "").toLowerCase();
      const type = (typeVal || "").toLowerCase();
      const title = (t.transactionTitle || "").toLowerCase();
      const phone = (t.citizenPhone || "").toLowerCase();
      if (!name.includes(q) && !serial.includes(q) && !type.includes(q) && !title.includes(q) && !phone.includes(q))
        return false;
    }
    return true;
  });

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

  const handleDelete = useCallback(async (id: string) => {
    setDeleteConfirming(true);
    try {
      const res = await fetch(`/api/admin/transactions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        setDeleteId(null);
        loadData();
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1B1B1B]">شؤون المواطنين</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">إدارة بيانات المواطنين والاستعلامات والمعاملات</p>
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

      {/* إحصائيات سريعة */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#d4cfc8] bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-[#5a5a5a]">إجمالي المعاملات</p>
          <p className="mt-1 text-2xl font-bold text-[#1B1B1B]">{loading ? "—" : statusCounts.total}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-amber-700">قيد التنفيذ</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{loading ? "—" : statusCounts.pending}</p>
        </div>
        <div className="rounded-xl border border-[#0D9488]/30 bg-[#ccfbf1]/50 p-4 shadow-sm">
          <p className="text-sm font-medium text-[#0f766e]">منجزة</p>
          <p className="mt-1 text-2xl font-bold text-[#0D9488]">{loading ? "—" : statusCounts.done}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-red-700">متأخرة</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{loading ? "—" : statusCounts.overdue}</p>
        </div>
      </div>

      {/* شريط البحث والفلترة */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#d4cfc8] bg-white p-4 shadow-sm">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-[#5a5a5a]">بحث</label>
          <input
            type="search"
            placeholder="بحث بالاسم أو الرقم أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2 text-sm text-[#1B1B1B] focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-[#5a5a5a]">نوع المعاملة</label>
          <select
            value={filterTransactionType}
            onChange={(e) => setFilterTransactionType(e.target.value)}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2 text-sm text-[#1B1B1B] focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
          >
            <option value="">الكل</option>
            {allTransactionTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-[#5a5a5a]">تاريخ التقديم من</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2 text-sm text-[#1B1B1B] focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
          />
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-medium text-[#5a5a5a]">تاريخ التقديم إلى</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-full rounded-lg border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2 text-sm text-[#1B1B1B] focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
          />
        </div>
      </div>

      {/* جدول المعاملات */}
      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1B1B]">جدول المعاملات</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">جميع المعاملات المسجلة في مكتبك مع تفاصيلها</p>
        {loading ? (
          <p className="mt-4 py-12 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : transactions.length === 0 ? (
          <p className="mt-4 py-12 text-center text-[#5a5a5a]">لا توجد معاملات مسجلة بعد.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            {filteredTransactions.length === 0 ? (
              <p className="py-8 text-center text-[#5a5a5a]">لا توجد نتائج تطابق معايير البحث والفلترة.</p>
            ) : (
            <table className="w-full min-w-[1000px] text-right text-sm">
              <thead>
                <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">رقم المعاملة</th>
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">اسم المواطن</th>
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">الهاتف</th>
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">العنوان</th>
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">نوع المعاملة</th>
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">عنوان المعاملة</th>
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">موظف / جهة العمل</th>
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">تاريخ التقديم</th>
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">الحالة</th>
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">تاريخ الإنشاء</th>
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">مرفقات</th>
                  <th className="py-3 px-2 font-medium text-[#5a5a5a]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[#d4cfc8]/80 transition hover:bg-[#f6f3ed]/50"
                  >
                    <td className="py-3 px-2 font-mono text-[#0D9488]">{t.serialNumber || "—"}</td>
                    <td className="py-3 px-2 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                    <td className="py-3 px-2 text-[#5a5a5a]" dir="ltr">{t.citizenPhone || "—"}</td>
                    <td className="max-w-[140px] truncate py-3 px-2 text-[#5a5a5a]" title={t.citizenAddress || undefined}>
                      {t.citizenAddress || "—"}
                    </td>
                    <td className="py-3 px-2 text-[#1B1B1B]">{t.transactionType || t.type || "—"}</td>
                    <td className="max-w-[180px] truncate py-3 px-2 text-[#1B1B1B]" title={t.transactionTitle || undefined}>
                      {t.transactionTitle || "—"}
                    </td>
                    <td className="max-w-[160px] truncate py-3 px-2 text-[#5a5a5a]" title={getEmployeeInfo(t)}>
                      {getEmployeeInfo(t)}
                    </td>
                    <td className="py-3 px-2 text-[#5a5a5a]">{formatDate(t.submissionDate)}</td>
                    <td className="py-3 px-2">
                      {(() => {
                        if (t.cannotComplete)
                          return (
                            <span className="inline-block rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                              لا يمكن الانجاز
                            </span>
                          );
                        if (t.delegateName)
                          return (
                            <span className="inline-block rounded-full bg-[#1E6B3A]/20 px-2 py-0.5 text-xs font-medium text-[#1E6B3A]">
                              إلى مخول
                            </span>
                          );
                        if (t.urgent)
                          return (
                            <span className="inline-block rounded-full bg-[#5B7C99]/20 px-2 py-0.5 text-xs font-medium text-[#5B7C99]">
                              وصلت قسم المتابعة
                            </span>
                          );
                        if (t.reachedSorting)
                          return (
                            <span className="inline-block rounded-full bg-[#7C3AED]/20 px-2 py-0.5 text-xs font-medium text-[#7C3AED]">
                              وصلت قسم الفرز
                            </span>
                          );
                        return (
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
                        );
                      })()}
                    </td>
                    <td className="py-3 px-2 text-[#5a5a5a]">{formatDate(t.createdAt)}</td>
                    <td className="py-3 px-2">
                      {getAttachmentsCount(t.attachments) > 0 ? (
                        <span className="text-[#0D9488]">{getAttachmentsCount(t.attachments)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleView(t)}
                          className="rounded-lg border border-[#0D9488]/50 bg-[#0D9488]/10 px-2 py-1 text-xs font-medium text-[#0f766e] hover:bg-[#0D9488]/20"
                        >
                          عرض
                        </button>
                        <Link
                          href={`/reception/citizens/new?edit=${t.id}`}
                          className="rounded-lg border border-amber-600/50 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          تعديل
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteId(t.id)}
                          className="rounded-lg border border-red-500/50 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        )}
      </article>

      {/* مودال عرض الوصل */}
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

      {/* تأكيد الحذف */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleteConfirming && setDeleteId(null)} aria-hidden />
          <div className="relative rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#1B1B1B]">تأكيد الحذف</h3>
            <p className="mt-2 text-sm text-[#5a5a5a]">هل أنت متأكد من حذف هذه المعاملة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleteConfirming}
                className="flex-1 rounded-lg border border-[#d4cfc8] px-4 py-2.5 font-medium text-[#1B1B1B] hover:bg-gray-50 disabled:opacity-60"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteId)}
                disabled={deleteConfirming}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteConfirming ? "جاري الحذف…" : "حذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
