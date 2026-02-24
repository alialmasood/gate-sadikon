"use client";

import { useState, useCallback, useEffect } from "react";
import AddTransactionModal from "@/app/admin/citizens/AddTransactionModal";

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
  const [addModalOpen, setAddModalOpen] = useState(false);

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

  const handleAddSuccess = useCallback(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1B1B1B]">شؤون المواطنين</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">إدارة بيانات المواطنين والاستعلامات والمعاملات</p>
        </div>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-[#0D9488] bg-[#0D9488] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0f766e] hover:border-[#0f766e]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          معاملة جديدة
        </button>
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
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
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
                    </td>
                    <td className="py-3 px-2 text-[#5a5a5a]">{formatDate(t.createdAt)}</td>
                    <td className="py-3 px-2">
                      {getAttachmentsCount(t.attachments) > 0 ? (
                        <span className="text-[#0D9488]">{getAttachmentsCount(t.attachments)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <AddTransactionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
