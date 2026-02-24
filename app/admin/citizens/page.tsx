"use client";

import { useEffect, useState, useCallback } from "react";
import AddTransactionModal from "./AddTransactionModal";

type Citizen = {
  name: string;
  total: number;
  pending: number;
  done: number;
  overdue: number;
  transactions: { id: string; status: string; createdAt: string; completedAt: string | null }[];
};

type Transaction = {
  id: string;
  citizenName: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
};

function formatDate(s: string): string {
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      dateStyle: "short",
      numberingSystem: "arab",
    }).format(new Date(s));
  } catch {
    return s;
  }
}

export default function AdminCitizensPage() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, done: 0, overdue: 0, total: 0 });
  const [selectedCitizen, setSelectedCitizen] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [citizensRes, transRes] = await Promise.all([
        fetch("/api/admin/citizens"),
        fetch("/api/admin/transactions?limit=200"),
      ]);
      if (citizensRes.ok) {
        const { citizens: data } = await citizensRes.json();
        setCitizens(data || []);
      }
      if (transRes.ok) {
        const { transactions: trans } = await transRes.json();
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
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTransactions = selectedCitizen
    ? transactions.filter((t) => (t.citizenName || "").trim().toLowerCase() === selectedCitizen.toLowerCase())
    : transactions;

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

      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1B1B]">قائمة مواطنين</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">المواطنين الذين قدموا معاملات لمكتبك مع إحصائيات معاملاتهم.</p>
        {loading ? (
          <p className="mt-4 py-8 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : citizens.length === 0 ? (
          <p className="mt-4 py-8 text-center text-[#5a5a5a]">لا توجد بيانات مواطنين مسجلة.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-right">
              <thead>
                <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                  <th className="py-3 pr-2">اسم المواطن</th>
                  <th className="py-3 pr-2">إجمالي المعاملات</th>
                  <th className="py-3 pr-2">قيد التنفيذ</th>
                  <th className="py-3 pr-2">منجزة</th>
                  <th className="py-3 pr-2">متأخرة</th>
                </tr>
              </thead>
              <tbody>
                {citizens.map((c) => (
                  <tr
                    key={c.name}
                    className={`border-b border-[#d4cfc8]/80 cursor-pointer transition ${
                      selectedCitizen === c.name.toLowerCase() ? "bg-[#e8f5ec]" : "hover:bg-[#f6f3ed]"
                    }`}
                    onClick={() => setSelectedCitizen(selectedCitizen === c.name.toLowerCase() ? null : c.name.toLowerCase())}
                  >
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{c.name}</td>
                    <td className="py-3 pr-2 text-[#1B1B1B]">{c.total}</td>
                    <td className="py-3 pr-2">
                      <span className={c.pending > 0 ? "text-amber-600 font-medium" : "text-[#5a5a5a]"}>{c.pending}</span>
                    </td>
                    <td className="py-3 pr-2">
                      <span className={c.done > 0 ? "text-[#1E6B3A] font-medium" : "text-[#5a5a5a]"}>{c.done}</span>
                    </td>
                    <td className="py-3 pr-2">
                      <span className={c.overdue > 0 ? "text-red-600 font-medium" : "text-[#5a5a5a]"}>{c.overdue}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1B1B]">معاملاتهم</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">
          {selectedCitizen ? "معاملات المواطن المحدد" : "جميع المعاملات. اضغط على مواطن في القائمة أعلاه لفلترة معاملاته."}
        </p>
        {loading ? (
          <p className="mt-4 py-8 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="mt-4 py-8 text-center text-[#5a5a5a]">لا توجد معاملات لعرضها.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-right">
              <thead>
                <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                  <th className="py-3 pr-2">اسم المواطن</th>
                  <th className="py-3 pr-2">الحالة</th>
                  <th className="py-3 pr-2">تاريخ الإنشاء</th>
                  <th className="py-3 pr-2">تاريخ الإنجاز</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 80).map((t) => (
                  <tr key={t.id} className="border-b border-[#d4cfc8]/80">
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                    <td className="py-3 pr-2">
                      <span
                        className={`font-medium ${
                          t.status === "DONE" ? "text-[#1E6B3A]" : t.status === "OVERDUE" ? "text-red-600" : "text-amber-600"
                        }`}
                      >
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{formatDate(t.createdAt)}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{t.completedAt ? formatDate(t.completedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTransactions.length > 80 && (
              <p className="mt-3 text-sm text-[#5a5a5a]">عرض 80 من أصل {filteredTransactions.length} معاملة</p>
            )}
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1B1B]">حالة المتابعة</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col rounded-xl border border-[#d4cfc8] bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-[#5a5a5a]">إجمالي المعاملات</p>
            <p className="mt-1 text-2xl font-bold text-[#1B1B1B]">{loading ? "—" : statusCounts.total}</p>
          </div>
          <div className="flex flex-col rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-sm font-medium text-amber-700">قيد التنفيذ</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{loading ? "—" : statusCounts.pending}</p>
          </div>
          <div className="flex flex-col rounded-xl border border-[#1E6B3A]/30 bg-[#1E6B3A]/5 p-4 shadow-sm">
            <p className="text-sm font-medium text-[#1E6B3A]">منجزة</p>
            <p className="mt-1 text-2xl font-bold text-[#1E6B3A]">{loading ? "—" : statusCounts.done}</p>
          </div>
          <div className="flex flex-col rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <p className="text-sm font-medium text-red-700">متأخرة</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{loading ? "—" : statusCounts.overdue}</p>
          </div>
        </div>
      </article>

      <AddTransactionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
