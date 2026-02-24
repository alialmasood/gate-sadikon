"use client";

import { useEffect, useState, useCallback } from "react";

type Transaction = {
  id: string;
  citizenName: string | null;
  status: string;
  type: string | null;
  createdAt: string;
  completedAt: string | null;
  delegateName: string | null;
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

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [newCitizenName, setNewCitizenName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
                      {t.status !== "DONE" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(t.id, "DONE")}
                          disabled={updatingId === t.id}
                          className="rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-2 py-1 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20 disabled:opacity-60"
                        >
                          {updatingId === t.id ? "…" : "تسجيل إنجاز"}
                        </button>
                      )}
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
    </div>
  );
}
