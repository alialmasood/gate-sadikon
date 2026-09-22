"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type Assignment = {
  id: string;
  formationName: string;
  subDeptName: string | null;
};

type Delegate = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  serialNumber: string | null;
  ministry: string | null;
  department: string | null;
  assignmentDate: string | null;
  avatarUrl: string | null;
  enabled: boolean;
  createdAt: string;
  delegateId?: string | null;
  transactionCount?: number;
  assignments?: Assignment[];
};

type DelegateTransaction = {
  id: string;
  serialNumber: string | null;
  citizenName: string | null;
  transactionType: string | null;
  type: string | null;
  officeName: string | null;
  formationName: string | null;
  stageLabel: string;
  transferred: boolean;
  transferredFromDelegateName: string | null;
};

function assignmentLabel(a: Assignment): string {
  return a.subDeptName ? `${a.formationName} — ${a.subDeptName}` : a.formationName;
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

function downloadDelegatesExcel(list: Delegate[]) {
  const headers = ["م", "الرقم التسلسلي", "الاسم الكامل", "عدد المعاملات", "التكليفات", "الوزارة/الهيئة", "الهاتف", "البريد الإلكتروني", "تاريخ التكليف", "الحالة"];
  const rows = list.map((d, i) => [
    String(i + 1),
    escapeCsvCell(d.serialNumber ?? ""),
    escapeCsvCell(d.name ?? d.email),
    String(d.transactionCount ?? 0),
    escapeCsvCell((d.assignments ?? []).map(assignmentLabel).join(" | ")),
    escapeCsvCell(d.ministry ?? ""),
    escapeCsvCell(d.phone ?? ""),
    escapeCsvCell(d.email),
    escapeCsvCell(formatDateShort(d.assignmentDate)),
    escapeCsvCell(d.enabled ? "مفعّل" : "معطّل"),
  ]);
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `المخولون-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDelegatesPage() {
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Delegate | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [transactions, setTransactions] = useState<DelegateTransaction[]>([]);
  const [transferTarget, setTransferTarget] = useState<Record<string, string>>({});
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [transferMessage, setTransferMessage] = useState("");

  const loadData = useCallback(async (opts?: { silent?: boolean; bypassCache?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    if (!opts?.silent) setError("");
    try {
      const url = opts?.bypassCache ? `/api/admin/delegates?t=${Date.now()}` : "/api/admin/delegates";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("فشل تحميل البيانات");
      const data = await res.json();
      setDelegates(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!opts?.silent) setError("تعذر تحميل قائمة المخولين");
      setDelegates([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  const openTransactions = useCallback(async (d: Delegate, opts?: { keepMessage?: boolean }) => {
    setViewing(d);
    setTxLoading(true);
    setTxError("");
    if (!opts?.keepMessage) setTransferMessage("");
    try {
      const res = await fetch(`/api/admin/delegates/${d.id}/transactions?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "فشل تحميل المعاملات");
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (e) {
      setTransactions([]);
      setTxError(e instanceof Error ? e.message : "تعذر تحميل معاملات المخول");
    } finally {
      setTxLoading(false);
    }
  }, []);

  const transferTransaction = useCallback(
    async (tx: DelegateTransaction) => {
      if (!viewing) return;
      const toUserId = transferTarget[tx.id];
      const target = delegates.find((d) => d.id === toUserId);
      if (!toUserId || !target) {
        setTransferMessage("اختر المخول الذي ستُنقل إليه المعاملة");
        return;
      }
      const confirmed = window.confirm(
        `نقل المعاملة ${tx.serialNumber ? `رقم ${tx.serialNumber}` : ""} من «${viewing.name || viewing.email}» إلى «${target.name || target.email}»؟\nستُحذف من حساب المخول الأصلي وتظهر في حساب المخول الجديد كمعاملة محوّلة من مكتب ${tx.officeName || "—"}، وقد وصلت إلى: ${tx.stageLabel}.`
      );
      if (!confirmed) return;
      setTransferringId(tx.id);
      setTransferMessage("");
      try {
        const res = await fetch("/api/admin/delegates/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: tx.id, toUserId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "تعذر نقل المعاملة");
        setTransferMessage(`نُقلت المعاملة إلى «${data.toDelegateName || target.name || target.email}» ولم تعد لدى المخول الأصلي.`);
        await openTransactions(viewing, { keepMessage: true });
        await loadData({ silent: true, bypassCache: true });
      } catch (e) {
        setTransferMessage(e instanceof Error ? e.message : "تعذر نقل المعاملة");
      } finally {
        setTransferringId(null);
      }
    },
    [delegates, loadData, openTransactions, transferTarget, viewing]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(() => loadData({ silent: true, bypassCache: true }));

  const filtered = useMemo(() => {
    if (!search.trim()) return delegates;
    const q = search.trim().toLowerCase();
    return delegates.filter(
      (d) =>
        (d.name ?? "").toLowerCase().includes(q) ||
        (d.email ?? "").toLowerCase().includes(q) ||
        (d.serialNumber ?? "").toLowerCase().includes(q) ||
        (d.ministry ?? "").toLowerCase().includes(q) ||
        (d.phone ?? "").includes(q)
    );
  }, [delegates, search]);

  const stats = useMemo(() => {
    const enabled = delegates.filter((d) => d.enabled).length;
    const disabled = delegates.filter((d) => !d.enabled).length;
    return { total: delegates.length, enabled, disabled };
  }, [delegates]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="w-full space-y-3 md:hidden">
          <div className="rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-[#f6f3ed]/60 px-4 py-3 shadow-sm">
            <h1 className="text-lg font-bold text-[#1B1B1B]">المخولون</h1>
            <p className="mt-0.5 text-xs text-[#5a5a5a]">حسابات المخولين المضافة من لوحة السوبر أدمن، مع معاملاتهم وإمكانية نقل المعاملة بين المخولين</p>
          </div>
        </div>
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-[#1B1B1B]">المخولون</h1>
          <p className="mt-0.5 text-sm text-[#5a5a5a]">حسابات المخولين المضافة من لوحة السوبر أدمن، مع معاملاتهم وإمكانية نقل المعاملة بين المخولين</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] transition hover:bg-[#f6f3ed] disabled:opacity-50"
          >
            تحديث
          </button>
          <button
            type="button"
            onClick={() => downloadDelegatesExcel(filtered)}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[#5B7C99] bg-[#5B7C99] px-4 py-2.5 font-medium text-white transition hover:bg-[#4a6a85] disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير إكسل
          </button>
        </div>
      </div>

      {/* البطاقات الإحصائية — موبايل فقط: خارج بطاقة الجدول */}
      <div className="flex flex-wrap gap-2 md:hidden">
        <div className={`rounded-lg px-3 py-1.5 text-sm font-medium ${stats.total > 0 ? "bg-[#1E6B3A]/10 text-[#1E6B3A]" : "bg-[#e8ecf0] text-[#5a5a5a]"}`}>
          المجموع: {stats.total}
        </div>
        <div className="rounded-lg bg-[#1E6B3A]/10 px-3 py-1.5 text-sm font-medium text-[#1E6B3A]">مفعّل: {stats.enabled}</div>
        <div className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700">معطّل: {stats.disabled}</div>
      </div>

      <div className="rounded-xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <div className={`rounded-lg px-3 py-1.5 text-sm font-medium ${stats.total > 0 ? "bg-[#1E6B3A]/10 text-[#1E6B3A]" : "bg-[#e8ecf0] text-[#5a5a5a]"}`}>
              المجموع: {stats.total}
            </div>
            <div className="rounded-lg bg-[#1E6B3A]/10 px-3 py-1.5 text-sm font-medium text-[#1E6B3A]">مفعّل: {stats.enabled}</div>
            <div className="rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700">معطّل: {stats.disabled}</div>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث (الاسم، البريد، الرقم التسلسلي، الوزارة، الهاتف…)"
            className="max-w-xs rounded-lg border border-[#d4cfc8] bg-white px-3 py-2 text-sm text-[#1B1B1B] placeholder:text-[#8a8a8a] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]"
            dir="rtl"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-amber-800">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E6B3A] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-[#5a5a5a]">لا يوجد مخولون مسجلون في النظام.</p>
        ) : (
          <>
            {/* عرض موبايل: بطاقات قابلة للتوسيع */}
            <div className="space-y-3 md:hidden" dir="rtl">
              {filtered.map((d, idx) => {
                const isExpanded = expandedId === d.id;
                return (
                  <div
                    key={d.id}
                    className="overflow-hidden rounded-xl border border-[#d4cfc8] bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : d.id)}
                      className="flex w-full items-center justify-between gap-3 border-b border-[#d4cfc8]/60 bg-[#fafafa] px-4 py-3 text-right transition hover:bg-[#f6f3ed]"
                    >
                      <span className="text-sm font-medium text-[#5a5a5a]">{idx + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-[#1B1B1B]">{d.name || d.email}</span>
                      <span className="shrink-0 text-[#1E6B3A]">
                        <svg
                          className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-[#d4cfc8]/60 bg-white p-4">
                        <dl className="space-y-3 text-sm">
                          <div className="flex flex-row-reverse justify-between gap-4 border-b border-[#d4cfc8]/40 pb-2">
                            <dt className="shrink-0 text-[#5a5a5a]">الرقم التسلسلي</dt>
                            <dd className="min-w-0 flex-1 truncate font-medium text-[#1B1B1B]" dir="ltr">{d.serialNumber || "—"}</dd>
                          </div>
                          <div className="flex flex-row-reverse justify-between gap-4 border-b border-[#d4cfc8]/40 pb-2">
                            <dt className="shrink-0 text-[#5a5a5a]">الاسم</dt>
                            <dd className="min-w-0 flex-1 font-medium text-[#1B1B1B]">{d.name || d.email}</dd>
                          </div>
                          <div className="flex flex-row-reverse justify-between gap-4 border-b border-[#d4cfc8]/40 pb-2">
                            <dt className="shrink-0 text-[#5a5a5a]">الوزارة/الهيئة</dt>
                            <dd className="min-w-0 flex-1 font-medium text-[#1B1B1B]">{d.ministry || "—"}</dd>
                          </div>
                          <div className="flex flex-row-reverse justify-between gap-4 border-b border-[#d4cfc8]/40 pb-2">
                            <dt className="shrink-0 text-[#5a5a5a]">الهاتف</dt>
                            <dd className="min-w-0 flex-1 font-medium text-[#1B1B1B]" dir="ltr">{d.phone || "—"}</dd>
                          </div>
                          <div className="flex flex-row-reverse justify-between gap-4 border-b border-[#d4cfc8]/40 pb-2">
                            <dt className="shrink-0 text-[#5a5a5a]">البريد الإلكتروني</dt>
                            <dd className="min-w-0 flex-1 break-all font-medium text-[#1B1B1B]" dir="ltr">{d.email}</dd>
                          </div>
                          <div className="flex flex-row-reverse justify-between gap-4 border-b border-[#d4cfc8]/40 pb-2">
                            <dt className="shrink-0 text-[#5a5a5a]">تاريخ التكليف</dt>
                            <dd className="min-w-0 flex-1 font-medium text-[#1B1B1B]">{formatDateShort(d.assignmentDate)}</dd>
                          </div>
                          <div className="flex flex-row-reverse justify-between gap-4 pb-0">
                            <dt className="shrink-0 text-[#5a5a5a]">الصورة</dt>
                            <dd>
                              {d.avatarUrl ? (
                                <img src={d.avatarUrl} alt="" className="h-12 w-12 rounded-full border border-[#d4cfc8] object-cover" />
                              ) : (
                                <span className="text-[#5a5a5a]">—</span>
                              )}
                            </dd>
                          </div>
                          <div className="flex flex-row-reverse justify-between gap-4 border-b border-[#d4cfc8]/40 pb-2">
                            <dt className="shrink-0 text-[#5a5a5a]">عدد المعاملات</dt>
                            <dd className="font-medium text-[#1B1B1B]">{d.transactionCount ?? 0}</dd>
                          </div>
                          <div className="flex flex-row-reverse justify-between gap-4 border-b border-[#d4cfc8]/40 pb-2">
                            <dt className="shrink-0 text-[#5a5a5a]">التكليفات</dt>
                            <dd className="min-w-0 flex-1 text-[#1B1B1B]">
                              {(d.assignments ?? []).length === 0
                                ? "—"
                                : (d.assignments ?? []).map(assignmentLabel).join("، ")}
                            </dd>
                          </div>
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => void openTransactions(d)}
                              className="w-full rounded-lg bg-[#1E6B3A] px-3 py-2 text-sm font-medium text-white"
                            >
                              عرض المعاملات ونقلها
                            </button>
                          </div>
                          <div className="flex flex-row-reverse justify-between gap-4 border-t border-[#d4cfc8]/40 pt-2">
                            <dt className="shrink-0 text-[#5a5a5a]">الحالة</dt>
                            <dd>
                              <span className={d.enabled ? "font-medium text-[#1E6B3A]" : "font-medium text-amber-600"}>
                                {d.enabled ? "مفعّل" : "معطّل"}
                              </span>
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* عرض اللابتوب: الجدول الأصلي */}
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-right">
              <thead>
                <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                  <th className="py-3 pr-2">م</th>
                  <th className="py-3 pr-2">الاسم الكامل</th>
                  <th className="py-3 pr-2">عدد المعاملات</th>
                  <th className="py-3 pr-2">التكليفات</th>
                  <th className="py-3 pr-2">الرقم التسلسلي</th>
                  <th className="py-3 pr-2">الحالة</th>
                  <th className="py-3 pr-2">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, idx) => (
                  <tr key={d.id} className="border-b border-[#d4cfc8]/80 align-top hover:bg-[#fafafa]">
                    <td className="py-3 pr-2 text-[#5a5a5a]">{idx + 1}</td>
                    <td className="py-3 pr-2">
                      <div className="font-medium text-[#1B1B1B]">{d.name || d.email}</div>
                      <div className="mt-0.5 text-xs text-[#5a5a5a]" dir="ltr">{d.phone || d.email}</div>
                    </td>
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{d.transactionCount ?? 0}</td>
                    <td className="max-w-[280px] py-3 pr-2 text-sm text-[#5a5a5a]">
                      {(d.assignments ?? []).length === 0
                        ? "—"
                        : (d.assignments ?? []).map((a) => (
                            <div key={a.id}>{assignmentLabel(a)}</div>
                          ))}
                    </td>
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]" dir="ltr">{d.serialNumber || "—"}</td>
                    <td className="py-3 pr-2">
                      <span className={d.enabled ? "font-medium text-[#1E6B3A]" : "font-medium text-amber-600"}>{d.enabled ? "مفعّل" : "معطّل"}</span>
                    </td>
                    <td className="py-3 pr-2">
                      <button
                        type="button"
                        onClick={() => void openTransactions(d)}
                        className="rounded-lg bg-[#1E6B3A] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#185a31]"
                      >
                        المعاملات
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}

        {search.trim() && filtered.length < delegates.length && (
          <p className="mt-3 text-sm text-[#5a5a5a]">
            عرض {filtered.length} من {delegates.length} نتيجة
          </p>
        )}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" dir="rtl">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-lg sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#d4cfc8] px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-[#1B1B1B]">معاملات {viewing.name || viewing.email}</h2>
                <p className="mt-1 text-sm text-[#5a5a5a]">عرض المرحلة الحالية، ثم نقل المعاملة إلى مخول آخر. بعد النقل تختفي من هذا الحساب.</p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="rounded-lg border border-[#d4cfc8] px-3 py-1.5 text-sm text-[#1B1B1B] hover:bg-[#f6f3ed]"
              >
                إغلاق
              </button>
            </div>
            <div className="overflow-auto px-4 py-4 sm:px-6">
              {transferMessage && (
                <div className="mb-3 rounded-lg border border-[#1E6B3A]/20 bg-[#1E6B3A]/10 px-3 py-2 text-sm text-[#1E6B3A]">{transferMessage}</div>
              )}
              {txError && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{txError}</div>
              )}
              {txLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E6B3A] border-t-transparent" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="py-10 text-center text-[#5a5a5a]">لا توجد معاملات محالة إلى هذا المخول ضمن نطاق مكتبك.</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const others = delegates.filter((d) => d.id !== viewing.id && d.enabled);
                    return (
                      <article key={tx.id} className="rounded-xl border border-[#d4cfc8] p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-sm font-bold text-[#1E6B3A]" dir="ltr">{tx.serialNumber || "—"}</p>
                            <p className="mt-1 font-medium text-[#1B1B1B]">{tx.citizenName || "—"}</p>
                            <p className="text-sm text-[#5a5a5a]">{tx.transactionType || tx.type || "—"}</p>
                          </div>
                          <span className="rounded-lg bg-[#5B7C99]/15 px-2.5 py-1 text-xs font-medium text-[#3d5a73]">{tx.stageLabel}</span>
                        </div>
                        <p className="mt-2 text-sm text-[#5a5a5a]">المكتب: {tx.officeName || "—"}{tx.formationName ? ` — ${tx.formationName}` : ""}</p>
                        {tx.transferred && (
                          <p className="mt-1 text-xs text-[#5B7C99]">محوّلة سابقاً من المخول {tx.transferredFromDelegateName || "—"}</p>
                        )}
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <select
                            value={transferTarget[tx.id] ?? ""}
                            onChange={(e) => setTransferTarget((prev) => ({ ...prev, [tx.id]: e.target.value }))}
                            className="min-w-0 flex-1 rounded-lg border border-[#d4cfc8] bg-white px-3 py-2 text-sm text-[#1B1B1B]"
                          >
                            <option value="">اختر المخول الجديد</option>
                            {others.map((d) => (
                              <option key={d.id} value={d.id}>{d.name || d.email}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={transferringId === tx.id || others.length === 0}
                            onClick={() => void transferTransaction(tx)}
                            className="rounded-lg border border-[#5B7C99] bg-[#5B7C99] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                          >
                            {transferringId === tx.id ? "جارٍ النقل…" : "نقل المعاملة"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
