"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";
import {
  SOURCE_SECTION_LABELS,
  formatElapsedSince,
  getTransactionStageLabel,
  isTransactionCompleted,
} from "@/lib/transaction-stage";

type Assignment = { id: string; formationName: string; subDeptName: string | null };

type Delegate = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  ministry: string | null;
  serialNumber: string | null;
  enabled: boolean;
  transactionCount: number;
  completedCount: number;
  openCount: number;
  assignments: Assignment[];
};

type DelegateTransaction = {
  id: string;
  serialNumber: string | null;
  citizenName: string | null;
  citizenPhone: string | null;
  transactionType: string | null;
  type: string | null;
  officeName: string | null;
  formationName: string | null;
  stageLabel: string;
  completed: boolean;
  completedAt: string | null;
  receivedAt: string;
  elapsedLabel: string;
  elapsedNote: string;
};

type FullTransaction = {
  id: string;
  citizenName: string | null;
  citizenPhone: string | null;
  citizenAddress: string | null;
  citizenMinistry: string | null;
  citizenDepartment: string | null;
  citizenOrganization: string | null;
  status: string;
  type: string | null;
  transactionType: string | null;
  transactionTitle: string | null;
  serialNumber: string | null;
  submissionDate: string | null;
  formationName: string | null;
  subDeptName: string | null;
  officeName: string | null;
  createdAt: string;
  completedAt: string | null;
  delegateName: string | null;
  followUpUrl: string | null;
  urgent?: boolean;
  cannotComplete?: boolean;
  cannotCompleteReason?: string | null;
  completedByAdmin?: boolean;
  reachedSorting?: boolean;
  sourceSection?: string | null;
  delegateId?: string | null;
  attachments?: { url?: string; name?: string }[] | null;
  delegateActions?: { text: string; attachmentUrl?: string; attachmentName?: string; createdAt: string }[];
};

function assignmentLabel(a: Assignment): string {
  return a.subDeptName ? `${a.formationName} — ${a.subDeptName}` : a.formationName;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", numberingSystem: "arab" }).format(new Date(s));
  } catch {
    return s;
  }
}

function formatDateTime(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      dateStyle: "medium",
      timeStyle: "short",
      numberingSystem: "arab",
    }).format(new Date(s));
  } catch {
    return s;
  }
}

export default function CoordinatorDelegatesPage() {
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Delegate | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [transactions, setTransactions] = useState<DelegateTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "open">("all");
  const [detail, setDetail] = useState<FullTransaction | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    if (!opts?.silent) setError("");
    try {
      const res = await fetch(`/api/coordinator/delegates?t=${Date.now()}`, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "فشل التحميل");
      setDelegates(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!opts?.silent) setError(e instanceof Error ? e.message : "تعذر تحميل المخولين");
      if (!opts?.silent) setDelegates([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  const openTransactions = useCallback(async (d: Delegate) => {
    setViewing(d);
    setStatusFilter("all");
    setTxLoading(true);
    setTxError("");
    setTransactions([]);
    try {
      const res = await fetch(`/api/coordinator/delegates/${d.id}/transactions?t=${Date.now()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "فشل تحميل المعاملات");
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (e) {
      setTxError(e instanceof Error ? e.message : "تعذر تحميل المعاملات");
    } finally {
      setTxLoading(false);
    }
  }, []);

  const openDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/coordinator/transactions/${id}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "فشل تحميل التفاصيل");
      setDetail(data as FullTransaction);
    } catch (e) {
      alert(e instanceof Error ? e.message : "تعذر عرض تفاصيل المعاملة");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useAutoRefresh(() => loadData({ silent: true }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return delegates;
    return delegates.filter(
      (d) =>
        (d.name ?? "").toLowerCase().includes(q) ||
        (d.email ?? "").toLowerCase().includes(q) ||
        (d.serialNumber ?? "").toLowerCase().includes(q) ||
        (d.ministry ?? "").toLowerCase().includes(q) ||
        (d.assignments ?? []).some((a) => assignmentLabel(a).toLowerCase().includes(q))
    );
  }, [delegates, search]);

  const visibleTransactions = useMemo(() => {
    if (statusFilter === "done") return transactions.filter((t) => t.completed);
    if (statusFilter === "open") return transactions.filter((t) => !t.completed);
    return transactions;
  }, [statusFilter, transactions]);

  const stats = useMemo(() => {
    const transactionCount = delegates.reduce((n, d) => n + (d.transactionCount || 0), 0);
    const completedCount = delegates.reduce((n, d) => n + (d.completedCount || 0), 0);
    return { delegates: delegates.length, transactionCount, completedCount };
  }, [delegates]);

  const detailCompleted = detail ? isTransactionCompleted(detail) : false;
  const detailElapsed = detail
    ? formatElapsedSince(detail.createdAt, detailCompleted ? detail.completedAt : null)
    : "";
  const detailStage = detail ? getTransactionStageLabel(detail) : "";
  const attachments = Array.isArray(detail?.attachments)
    ? detail.attachments.filter((a) => a && typeof a.url === "string")
    : [];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-lg font-semibold text-[#1B1B1B]">متابعة المخولين</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">
          حسابات المخولين المضافة من لوحة السوبر أدمن، ومعاملاتهم، ومرحلة كل معاملة، ومدة ما بعد الاستلام
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="rounded-lg bg-[#5B7C99]/10 px-3 py-1.5 text-sm font-medium text-[#5B7C99]">المخولون: {stats.delegates}</div>
        <div className="rounded-lg bg-[#1E6B3A]/10 px-3 py-1.5 text-sm font-medium text-[#1E6B3A]">المعاملات: {stats.transactionCount}</div>
        <div className="rounded-lg bg-[#0f766e]/10 px-3 py-1.5 text-sm font-medium text-[#0f766e]">المنجزة: {stats.completedCount}</div>
      </div>

      <div className="rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الرقم أو التكليف"
          className="mb-4 w-full max-w-md rounded-lg border border-[#d4cfc8] px-3 py-2 text-sm focus:border-[#5B7C99] focus:outline-none"
        />

        {error && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5B7C99] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-[#5a5a5a]">لا يوجد مخولون مطابقون.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((d) => (
                <article key={d.id} className="rounded-xl border border-[#d4cfc8] p-4">
                  <h3 className="font-semibold text-[#1B1B1B]">{d.name || d.email}</h3>
                  <p className="mt-1 text-sm text-[#5a5a5a]">المعاملات: {d.transactionCount} — المنجزة: {d.completedCount}</p>
                  <p className="mt-1 text-sm text-[#5a5a5a]">
                    {(d.assignments ?? []).length === 0 ? "بدون تكليف" : d.assignments.map(assignmentLabel).join("، ")}
                  </p>
                  <button
                    type="button"
                    onClick={() => void openTransactions(d)}
                    className="mt-3 w-full rounded-lg bg-[#5B7C99] px-3 py-2 text-sm font-medium text-white"
                  >
                    عرض المعاملات
                  </button>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-right">
                <thead>
                  <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                    <th className="py-3 pr-2">الاسم الكامل</th>
                    <th className="py-3 pr-2">عدد المعاملات</th>
                    <th className="py-3 pr-2">المنجزة</th>
                    <th className="py-3 pr-2">التكليفات</th>
                    <th className="py-3 pr-2">الحالة</th>
                    <th className="py-3 pr-2">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d.id} className="border-b border-[#d4cfc8]/80 align-top">
                      <td className="py-3 pr-2">
                        <div className="font-medium text-[#1B1B1B]">{d.name || d.email}</div>
                        <div className="text-xs text-[#5a5a5a]" dir="ltr">{d.serialNumber || d.email}</div>
                      </td>
                      <td className="py-3 pr-2 font-medium">{d.transactionCount}</td>
                      <td className="py-3 pr-2 text-[#0f766e]">{d.completedCount}</td>
                      <td className="max-w-[280px] py-3 pr-2 text-sm text-[#5a5a5a]">
                        {(d.assignments ?? []).length === 0
                          ? "—"
                          : d.assignments.map((a) => <div key={a.id}>{assignmentLabel(a)}</div>)}
                      </td>
                      <td className="py-3 pr-2">
                        <span className={d.enabled ? "text-[#1E6B3A]" : "text-amber-700"}>{d.enabled ? "مفعّل" : "معطّل"}</span>
                      </td>
                      <td className="py-3 pr-2">
                        <button
                          type="button"
                          onClick={() => void openTransactions(d)}
                          className="rounded-lg bg-[#5B7C99] px-3 py-1.5 text-sm font-medium text-white"
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
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#d4cfc8] px-4 py-4 sm:px-6">
              <div>
                <h3 className="text-lg font-semibold text-[#1B1B1B]">معاملات {viewing.name || viewing.email}</h3>
                <p className="mt-1 text-sm text-[#5a5a5a]">المرحلة الحالية، وهل أُنجزت، والمدة منذ استلام المعاملة</p>
              </div>
              <button type="button" onClick={() => setViewing(null)} className="rounded-lg border border-[#d4cfc8] px-3 py-1.5 text-sm">
                إغلاق
              </button>
            </div>
            <div className="overflow-auto px-4 py-4 sm:px-6">
              <div className="mb-3 flex flex-wrap gap-2">
                {(
                  [
                    ["all", "الكل"],
                    ["open", "غير المنجزة"],
                    ["done", "المنجزة"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`rounded-lg px-3 py-1.5 text-sm ${statusFilter === key ? "bg-[#5B7C99] text-white" : "bg-[#f6f3ed] text-[#1B1B1B]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {txError && <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{txError}</div>}
              {detailLoading && <p className="mb-3 text-sm text-[#5B7C99]">جارٍ تحميل تفاصيل المعاملة…</p>}
              {txLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5B7C99] border-t-transparent" />
                </div>
              ) : visibleTransactions.length === 0 ? (
                <p className="py-10 text-center text-[#5a5a5a]">لا توجد معاملات في هذا العرض.</p>
              ) : (
                <div className="space-y-3">
                  {visibleTransactions.map((tx) => (
                    <article key={tx.id} className="rounded-xl border border-[#d4cfc8] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm font-bold text-[#5B7C99]" dir="ltr">{tx.serialNumber ? `2026-${tx.serialNumber}` : "—"}</p>
                          <p className="mt-1 font-medium text-[#1B1B1B]">{tx.citizenName || "—"}</p>
                          <p className="text-sm text-[#5a5a5a]">{tx.transactionType || tx.type || "—"}</p>
                        </div>
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${tx.completed ? "bg-[#ccfbf1] text-[#0f766e]" : "bg-amber-100 text-amber-800"}`}>
                          {tx.completed ? "منجزة" : "غير منجزة"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#1B1B1B]">أين وصلت: {tx.stageLabel}</p>
                      <p className="text-sm text-[#5a5a5a]">المكتب: {tx.officeName || "—"}{tx.formationName ? ` — ${tx.formationName}` : ""}</p>
                      <p className="mt-1 text-sm text-[#5a5a5a]">
                        {tx.elapsedNote}: <span className="font-medium text-[#1B1B1B]">{tx.elapsedLabel}</span>
                        <span className="mr-2">— الاستلام {formatDate(tx.receivedAt)}</span>
                        {tx.completed && tx.completedAt ? <span> — الإنجاز {formatDate(tx.completedAt)}</span> : null}
                      </p>
                      <button
                        type="button"
                        onClick={() => void openDetail(tx.id)}
                        className="mt-3 rounded-lg border border-[#B08D57]/50 bg-[#B08D57]/10 px-3 py-2 text-sm font-medium text-[#9C7B49]"
                      >
                        التفاصيل ووصل المعاملة
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-[60] overflow-y-auto p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDetail(null)} />
          <div className="relative mx-auto mb-16 mt-6 max-w-2xl rounded-2xl border border-[#d4cfc8] bg-[#FAFAF9] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">تفاصيل المعاملة</h3>
              <button type="button" onClick={() => setDetail(null)} className="rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200" aria-label="إغلاق">
                إغلاق
              </button>
            </div>
            <dl className="mb-6 grid gap-3 rounded-xl border border-[#d4cfc8] bg-white p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-[#5a5a5a]">رقم المعاملة</dt><dd className="font-medium" dir="ltr">{detail.serialNumber ? `2026-${detail.serialNumber}` : "—"}</dd></div>
              <div><dt className="text-[#5a5a5a]">المواطن</dt><dd className="font-medium">{detail.citizenName || "—"}</dd></div>
              <div><dt className="text-[#5a5a5a]">الهاتف</dt><dd className="font-medium" dir="ltr">{detail.citizenPhone || "—"}</dd></div>
              <div><dt className="text-[#5a5a5a]">العنوان</dt><dd className="font-medium">{detail.citizenAddress || "—"}</dd></div>
              <div><dt className="text-[#5a5a5a]">نوع المعاملة</dt><dd className="font-medium">{detail.transactionType || detail.type || "—"}</dd></div>
              <div><dt className="text-[#5a5a5a]">الوصف</dt><dd className="font-medium">{detail.transactionTitle || "—"}</dd></div>
              <div><dt className="text-[#5a5a5a]">المكتب</dt><dd className="font-medium">{detail.officeName || "—"}</dd></div>
              <div><dt className="text-[#5a5a5a]">الجهة</dt><dd className="font-medium">{[detail.formationName, detail.subDeptName].filter(Boolean).join(" — ") || "—"}</dd></div>
              <div><dt className="text-[#5a5a5a]">المخول</dt><dd className="font-medium">{detail.delegateName || "—"}</dd></div>
              <div><dt className="text-[#5a5a5a]">أين وصلت</dt><dd className="font-medium">{detailStage}</dd></div>
              <div><dt className="text-[#5a5a5a]">الإنجاز</dt><dd className="font-medium">{detailCompleted ? "منجزة" : "غير منجزة"}</dd></div>
              <div>
                <dt className="text-[#5a5a5a]">{detailCompleted ? "المدة حتى الإنجاز" : "المدة منذ الاستلام"}</dt>
                <dd className="font-medium">{detailElapsed}</dd>
              </div>
              <div><dt className="text-[#5a5a5a]">تاريخ الاستلام</dt><dd className="font-medium">{formatDateTime(detail.createdAt)}</dd></div>
              <div><dt className="text-[#5a5a5a]">تاريخ التقديم</dt><dd className="font-medium">{formatDate(detail.submissionDate)}</dd></div>
              <div><dt className="text-[#5a5a5a]">تاريخ الإنجاز</dt><dd className="font-medium">{formatDateTime(detail.completedAt)}</dd></div>
              <div>
                <dt className="text-[#5a5a5a]">القسم المصدر</dt>
                <dd className="font-medium">{(detail.sourceSection && SOURCE_SECTION_LABELS[detail.sourceSection]) || detail.sourceSection || "—"}</dd>
              </div>
              {detail.cannotComplete ? (
                <div className="sm:col-span-2"><dt className="text-[#5a5a5a]">سبب تعذر الإنجاز</dt><dd className="font-medium">{detail.cannotCompleteReason || "—"}</dd></div>
              ) : null}
            </dl>
            {attachments.length > 0 && (
              <div className="mb-4 rounded-xl border border-[#d4cfc8] bg-white p-4">
                <h4 className="mb-2 text-sm font-bold text-[#1B1B1B]">المرفقات</h4>
                <ul className="space-y-1 text-sm">
                  {attachments.map((a, i) => (
                    <li key={`${a.url}-${i}`}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[#0D9488] hover:underline">{a.name || `مرفق ${i + 1}`}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {detail.delegateActions && detail.delegateActions.length > 0 && (
              <div className="mb-6 rounded-xl border border-[#5B7C99]/20 bg-[#5B7C99]/5 p-4">
                <h4 className="mb-3 text-sm font-bold text-[#5B7C99]">إجراءات المخول</h4>
                <ul className="space-y-2">
                  {detail.delegateActions.map((a, i) => (
                    <li key={i} className="rounded-lg border border-[#d4cfc8] bg-white p-3">
                      <p className="text-xs text-[#5a5a5a]">{formatDateTime(a.createdAt)}</p>
                      <p className="mt-1 text-sm text-[#1B1B1B]">{a.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <TransactionReceipt
              receipt={
                {
                  citizenName: detail.citizenName,
                  citizenPhone: detail.citizenPhone,
                  citizenAddress: detail.citizenAddress,
                  citizenMinistry: detail.citizenMinistry,
                  citizenDepartment: detail.citizenDepartment,
                  citizenOrganization: detail.citizenOrganization,
                  transactionType: detail.transactionType || detail.type,
                  transactionTitle: detail.transactionTitle,
                  formationName: detail.formationName,
                  subDeptName: detail.subDeptName,
                  officeName: detail.officeName,
                  serialNumber: detail.serialNumber,
                  followUpUrl: detail.followUpUrl,
                  submissionDate: detail.submissionDate,
                  createdAt: detail.createdAt,
                } satisfies ReceiptData
              }
              mode="modal"
              onClose={() => setDetail(null)}
              bannerText="وصل المعاملة"
            />
          </div>
        </div>
      )}
    </div>
  );
}
