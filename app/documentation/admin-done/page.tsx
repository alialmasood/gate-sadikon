"use client";

import { useEffect, useState, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";

type TxItem = {
  id: string;
  citizenName: string | null;
  citizenPhone: string | null;
  citizenAddress: string | null;
  citizenMinistry: string | null;
  citizenDepartment: string | null;
  citizenOrganization: string | null;
  transactionType: string | null;
  transactionTitle: string | null;
  serialNumber: string | null;
  formationName: string | null;
  subDeptName: string | null;
  officeName: string | null;
  submissionDate: string | null;
  createdAt: string | null;
  completedAt: string | null;
  attachments: { url: string; name?: string }[] | null;
  followUpUrl: string | null;
};

export default function DocumentationAdminDonePage() {
  const [list, setList] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTx, setViewTx] = useState<TxItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documentation/admin-done", { credentials: "include" });
      if (res.ok) setList(await res.json());
      else setList([]);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(load);

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    try {
      return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", numberingSystem: "arab" }).format(new Date(s));
    } catch {
      return s;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-lg font-semibold text-[#1B1B1B]">معاملات منجزة من المدير</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">المعاملات التي أُنجزت مباشرة من قبل مدير المكتب — تظهر هنا بعد إنجازها من لوحة التحكم</p>
      </div>

      {loading ? (
        <p className="py-12 text-center text-[#5a5a5a]">جاري التحميل…</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-[#d4cfc8] bg-white p-12 text-center shadow-sm">
          <p className="text-[#5a5a5a]">لا توجد معاملات منجزة من المدير حتى الآن.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-right text-sm">
              <thead>
                <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">رقم المعاملة</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">المواطن</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">نوع المعاملة</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">تاريخ الإنجاز</th>
                  <th className="py-3 px-3 font-medium text-[#5a5a5a]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className="border-b border-[#d4cfc8]/80 hover:bg-[#f6f3ed]/50">
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 font-mono text-[#1B1B1B]">{t.serialNumber || "—"}</td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 text-[#1B1B1B]">{t.transactionType || "—"}</td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 text-[#5a5a5a]">{formatDate(t.completedAt)}</td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => setViewTx(t)}
                        className="rounded-lg border border-[#7C3AED]/50 bg-[#7C3AED]/10 px-2 py-1 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/20"
                      >
                        عرض
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewTx && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
          <div className="fixed inset-0 bg-black/50" onClick={() => setViewTx(null)} aria-hidden />
          <div className="relative mx-auto mt-8 mb-16 max-w-2xl rounded-2xl border border-[#d4cfc8] bg-[#FAFAF9] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">عرض المعاملة — منجزة من المدير</h3>
              <button type="button" onClick={() => setViewTx(null)} className="rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200" aria-label="إغلاق">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TransactionReceipt
              receipt={
                {
                  citizenName: viewTx.citizenName,
                  citizenPhone: viewTx.citizenPhone,
                  citizenAddress: viewTx.citizenAddress,
                  citizenMinistry: viewTx.citizenMinistry,
                  citizenDepartment: viewTx.citizenDepartment,
                  citizenOrganization: viewTx.citizenOrganization,
                  transactionType: viewTx.transactionType,
                  formationName: viewTx.formationName,
                  subDeptName: viewTx.subDeptName,
                  officeName: viewTx.officeName,
                  serialNumber: viewTx.serialNumber,
                  followUpUrl: viewTx.followUpUrl,
                  submissionDate: viewTx.submissionDate,
                  createdAt: viewTx.createdAt,
                } as ReceiptData
              }
              mode="modal"
              onClose={() => setViewTx(null)}
            />
            {Array.isArray(viewTx.attachments) && viewTx.attachments.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 font-medium text-[#1B1B1B]">المرفقات</h4>
                <div className="space-y-2">
                  {viewTx.attachments.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-[#d4cfc8] bg-white p-3 text-sm text-[#7C3AED] hover:underline">
                      <span>📎</span> {a.name || "مرفق"}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
