"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";

type Transaction = {
  id: string;
  citizenName: string | null;
  status: string;
  type: string | null;
  createdAt: string;
  completedAt: string | null;
  delegateName: string | null;
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

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [newCitizenName, setNewCitizenName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewTransaction, setViewTransaction] = useState<FullTransaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

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

  const handleDelete = useCallback(async (id: string) => {
    setDeleteConfirming(true);
    try {
      const res = await fetch(`/api/admin/transactions/${id}`, { method: "DELETE" });
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">إدارة المعاملات</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${BORDER_RADIUS} border border-[#d4cfc8] bg-white px-3 py-2.5 text-sm text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none`}
          >
            <option value="">جميع الحالات</option>
            <option value="PENDING">قيد التنفيذ</option>
            <option value="DONE">منجزة</option>
            <option value="OVERDUE">متأخرة</option>
          </select>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`${BORDER_RADIUS} bg-[#1E6B3A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#175a2e]`}
          >
            إضافة معاملة
          </button>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <span className="font-medium">تنبيه: </span>
          لديك {overdueCount} معاملة متأخرة
        </div>
      )}

      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        {loading ? (
          <p className="py-12 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : transactions.length === 0 ? (
          <p className="py-12 text-center text-[#5a5a5a]">لا توجد معاملات. يمكنك إضافة معاملة جديدة.</p>
        ) : (
          <div className="overflow-x-auto">
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
                {transactions.map((t) => (
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
