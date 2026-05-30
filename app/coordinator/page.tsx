"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import Link from "next/link";
import {
  getCoordinatorSeenTransactionIds,
  markCoordinatorTransactionAsSeen,
  markAllCoordinatorTransactionsAsSeen,
} from "@/lib/coordinator-seen";
import {
  computeCoordinatorHandoffStats,
  getCoordinatorIncomingStatus,
  HANDOFF_SOURCE_LABEL,
  isHandoffFromSorting,
} from "@/lib/coordinator-incoming-status";

type AdminDoneItem = {
  id: string;
  citizenName: string | null;
  transactionType: string | null;
  serialNumber: string | null;
  completedAt: string | null;
};

type IncomingTx = {
  id: string;
  citizenName: string | null;
  transactionType: string | null;
  serialNumber: string | null;
  officeName: string | null;
  createdAt: string;
  updatedAt?: string | null;
  urgent?: boolean;
  cannotComplete?: boolean;
  delegateName?: string | null;
  completedByAdmin?: boolean;
  reachedSorting?: boolean;
  assignedFromSection?: string | null;
  sourceSection?: string | null;
  createdByName?: string | null;
  createdByOfficeName?: string | null;
};

const POLL_INTERVAL_MS = 4000;

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "short", numberingSystem: "arab" }).format(
      new Date(s)
    );
  } catch {
    return s;
  }
}

export default function CoordinatorDashboard() {
  const [adminDone, setAdminDone] = useState<AdminDoneItem[]>([]);
  const [incomingFromSorting, setIncomingFromSorting] = useState<IncomingTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => getCoordinatorSeenTransactionIds());

  const refreshSeen = useCallback(() => {
    setSeenIds(getCoordinatorSeenTransactionIds());
  }, []);

  useEffect(() => {
    const onFocus = () => refreshSeen();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshSeen]);

  const load = useCallback(async () => {
    try {
      const [resAdmin, resUrgent, resCannot, resDelegated] = await Promise.all([
        fetch("/api/documentation/admin-done", { credentials: "include" }),
        fetch("/api/transactions?limit=300&urgent=true", { credentials: "include" }),
        fetch("/api/transactions?limit=300&cannotComplete=true", { credentials: "include" }),
        fetch("/api/transactions?limit=300&delegated=true", { credentials: "include" }),
      ]);

      if (resAdmin.ok) {
        const data = await resAdmin.json();
        setAdminDone((data || []).slice(0, 10));
      } else {
        setAdminDone([]);
      }

      const dataUrgent = resUrgent.ok ? await resUrgent.json().catch(() => ({})) : {};
      const dataCannot = resCannot.ok ? await resCannot.json().catch(() => ({})) : {};
      const dataDelegated = resDelegated.ok ? await resDelegated.json().catch(() => ({})) : {};

      const seen = new Set<string>();
      const merged: IncomingTx[] = [];
      for (const t of [
        ...(dataUrgent.transactions || []),
        ...(dataCannot.transactions || []),
        ...(dataDelegated.transactions || []),
      ]) {
        if (!seen.has(t.id) && isHandoffFromSorting(t)) {
          seen.add(t.id);
          merged.push(t);
        }
      }
      merged.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );
      setIncomingFromSorting(merged);
    } catch {
      setAdminDone([]);
      setIncomingFromSorting([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  useAutoRefresh(load);

  useEffect(() => {
    refreshSeen();
  }, [incomingFromSorting, refreshSeen]);

  const unseenFromSorting = useMemo(
    () => incomingFromSorting.filter((t) => !seenIds.has(t.id)),
    [incomingFromSorting, seenIds]
  );

  const handoffStats = useMemo(
    () => computeCoordinatorHandoffStats(incomingFromSorting),
    [incomingFromSorting]
  );

  const handleMarkAllSeen = () => {
    markAllCoordinatorTransactionsAsSeen(unseenFromSorting.map((t) => t.id));
    refreshSeen();
  };

  const handleOpenNotification = (id: string) => {
    markCoordinatorTransactionAsSeen(id);
    refreshSeen();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="border-b border-[#d4cfc8] pb-4">
        <h2 className="text-xl font-bold text-[#1B1B1B]">
          وحدة التنسيق والمتابعة
          <span className="mx-2 font-normal text-[#c4bfb8]">|</span>
          <span className="font-normal text-base text-[#5a5a5a]">
            لوحة تحكم مركزية لمتابعة معاملات المكتب
          </span>
        </h2>
      </div>

      {/* إشعار: معاملات مستلمة من قسم الفرز */}
      {!loading && unseenFromSorting.length > 0 && (
        <article className="overflow-hidden rounded-2xl border-2 border-[#7C3AED]/40 bg-[#7C3AED]/5 shadow-sm">
          <div className="border-b border-[#7C3AED]/20 bg-[#7C3AED]/10 px-6 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#1B1B1B]">
                    إشعار — معاملات من قسم الفرز
                  </h2>
                  <p className="mt-0.5 text-sm text-[#5a5a5a]">
                    لديك {unseenFromSorting.length} معاملة جديدة من الفرز — راجع الحالة والمكتب
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleMarkAllSeen}
                className="rounded-lg border border-[#d4cfc8] bg-white px-3 py-1.5 text-xs font-medium text-[#5a5a5a] hover:bg-[#f6f3ed]"
              >
                تعليم الكل كمقروء
              </button>
            </div>
          </div>
          <ul className="divide-y divide-[#d4cfc8]/80 p-2 sm:p-4">
            {unseenFromSorting.slice(0, 8).map((t) => {
              const { label, href } = getCoordinatorIncomingStatus(t);
              const serial = t.serialNumber ? `2026-${t.serialNumber}` : "—";
              const office = t.officeName?.trim() || "غير محدد";
              return (
                <li key={t.id}>
                  <Link
                    href={href}
                    onClick={() => handleOpenNotification(t.id)}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1B1B1B]">
                        لديك معاملة{" "}
                        <span className="font-mono text-[#7C3AED]" dir="ltr">
                          {serial}
                        </span>
                        {t.citizenName ? ` — ${t.citizenName}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-[#5a5a5a]">
                        حالتها:{" "}
                        <span className="font-medium text-[#1B1B1B]">{label}</span>
                        {" · "}
                        من المكتب:{" "}
                        <span className="font-medium text-[#7C3AED]">{office}</span>
                        {t.transactionType ? ` · ${t.transactionType}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[#5a5a5a]">
                      {formatDate(t.updatedAt || t.createdAt)}
                    </span>
                    <svg
                      className="h-5 w-5 shrink-0 text-[#7C3AED]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
          {unseenFromSorting.length > 8 && (
            <div className="border-t border-[#d4cfc8]/80 px-6 py-3">
              <Link
                href="/coordinator/incoming"
                onClick={() =>
                  markAllCoordinatorTransactionsAsSeen(unseenFromSorting.map((t) => t.id))
                }
                className="text-sm font-medium text-[#7C3AED] hover:underline"
              >
                عرض كل {unseenFromSorting.length} معاملة →
              </Link>
            </div>
          )}
        </article>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#5B7C99] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* إحصائيات المعاملات المستلمة من الفرز */}
          <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
            <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
              <h2 className="text-base font-semibold text-[#1B1B1B]">
                إحصائيات المعاملات من الفرز
                <span className="mx-2 font-normal text-[#c4bfb8]">|</span>
                <span className="font-normal text-sm text-[#5a5a5a]">
                  معاملات وصلت إلى التنسيق عبر حساب الفرز — مصدر التسليم: {HANDOFF_SOURCE_LABEL}
                </span>
              </h2>
            </div>
            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#5B7C99] bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-[#5a5a5a]">إجمالي المستلمة</p>
                  <p className="mt-2 text-2xl font-bold text-[#5B7C99]">{handoffStats.total}</p>
                </div>
                <div className="flex flex-col rounded-xl border border-red-200 border-r-4 border-r-red-500 bg-red-50/40 p-4 shadow-sm">
                  <p className="text-sm font-medium text-red-700">عاجلة</p>
                  <p className="mt-2 text-2xl font-bold text-red-700">{handoffStats.urgent}</p>
                </div>
                <div className="flex flex-col rounded-xl border border-[#1E6B3A]/30 border-r-4 border-r-[#1E6B3A] bg-[#ccfbf1]/30 p-4 shadow-sm">
                  <p className="text-sm font-medium text-[#0f766e]">إلى المخول</p>
                  <p className="mt-2 text-2xl font-bold text-[#1E6B3A]">{handoffStats.delegated}</p>
                </div>
                <div className="flex flex-col rounded-xl border border-slate-200 border-r-4 border-r-slate-500 bg-slate-50/50 p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-700">لا يمكن إنجازها</p>
                  <p className="mt-2 text-2xl font-bold text-slate-700">{handoffStats.cannotComplete}</p>
                </div>
                <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#7C3AED] bg-[#7C3AED]/5 p-4 shadow-sm">
                  <p className="text-sm font-medium text-[#5a5a5a]">مصدر التسليم</p>
                  <p className="mt-2 text-lg font-bold text-[#7C3AED]">{HANDOFF_SOURCE_LABEL}</p>
                </div>
              </div>

              {handoffStats.byPreSortingOffice.length > 0 && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-[#1B1B1B]">
                    حسب مكتب التسجيل (قبل الفرز)
                  </h3>
                  <p className="mb-3 text-xs text-[#5a5a5a]">مكتب الارتباط</p>
                  <div className="flex flex-wrap gap-2">
                    {handoffStats.byPreSortingOffice.map((item) => (
                      <span
                        key={item.label}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#d4cfc8] bg-[#f6f3ed]/50 px-3 py-1.5 text-sm"
                      >
                        <span className="font-medium text-[#1B1B1B]">{item.label}</span>
                        <span className="rounded-full bg-[#5B7C99]/15 px-2 py-0.5 text-xs font-bold text-[#5B7C99]">
                          {item.count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {handoffStats.total === 0 && (
                <p className="rounded-xl border border-dashed border-[#d4cfc8] bg-[#f6f3ed]/30 px-4 py-6 text-center text-sm text-[#5a5a5a]">
                  لا توجد معاملات مستلمة من الفرز حالياً.
                </p>
              )}
            </div>
          </article>

          {handoffStats.byOffice.length > 0 && (
            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
                <h2 className="text-base font-semibold text-[#1B1B1B]">توزيع حسب مكتب الارتباط</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">
                  عدد المعاملات من كل مكتب (فرعي، استعلامات، مركزي، …) مع تصنيف الحالة ومكتب التسجيل قبل الفرز
                </p>
              </div>
              <div className="overflow-x-auto p-4 sm:p-6">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-[#d4cfc8] text-right text-[#5a5a5a]">
                      <th className="py-2 pl-4 pr-2 font-medium">المكتب</th>
                      <th className="px-2 py-2 font-medium">الإجمالي</th>
                      <th className="px-2 py-2 font-medium text-red-700">عاجلة</th>
                      <th className="px-2 py-2 font-medium text-[#1E6B3A]">إلى المخول</th>
                      <th className="px-2 py-2 font-medium text-slate-700">لا يمكن إنجازها</th>
                      <th className="py-2 pl-2 pr-4 font-medium">مكتب التسجيل (قبل الفرز)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handoffStats.byOffice.map((row) => (
                      <tr key={row.officeName} className="border-b border-[#d4cfc8]/60 last:border-0">
                        <td className="py-3 pl-4 pr-2 font-semibold text-[#1B1B1B]">{row.officeName}</td>
                        <td className="px-2 py-3 font-bold text-[#5B7C99]">{row.total}</td>
                        <td className="px-2 py-3 text-red-700">{row.urgent}</td>
                        <td className="px-2 py-3 text-[#1E6B3A]">{row.delegated}</td>
                        <td className="px-2 py-3 text-slate-700">{row.cannotComplete}</td>
                        <td className="py-3 pl-2 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {row.byPreSortingOffice.map((s) => (
                              <span
                                key={s.label}
                                className="rounded-md bg-[#f6f3ed] px-2 py-0.5 text-xs text-[#5a5a5a]"
                              >
                                {s.label}: {s.count}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-[#d4cfc8] px-6 py-4">
                {handoffStats.byOffice.map((item) => (
                  <span
                    key={item.officeName}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#d4cfc8] bg-white px-3 py-1.5 text-sm"
                  >
                    <span className="font-medium text-[#1B1B1B]">{item.officeName}</span>
                    <span className="rounded-full bg-[#5B7C99]/15 px-2 py-0.5 text-xs font-bold text-[#5B7C99]">
                      {item.total}
                    </span>
                  </span>
                ))}
              </div>
            </article>
          )}

          {/* إشعار: معاملات منجزة من المدير */}
          {adminDone.length > 0 && (
            <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
              <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
                <h2 className="text-base font-semibold text-[#1B1B1B]">إشعار — معاملات منجزة من المدير</h2>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">
                  المعاملات التي أُنجزت مباشرة من قبل مدير المكتب
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-2">
                  {adminDone.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d4cfc8] bg-[#f6f3ed]/30 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-[#1B1B1B]">
                        {t.citizenName || "—"} — {t.transactionType || "—"} (
                        {t.serialNumber ? `2026-${t.serialNumber}` : "—"})
                      </span>
                      <span className="text-xs text-[#5a5a5a]">
                        تم الإنجاز: {formatDate(t.completedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          )}

          {!loading && unseenFromSorting.length === 0 && incomingFromSorting.length > 0 && (
            <p className="rounded-xl border border-[#d4cfc8] bg-[#f6f3ed]/40 px-4 py-3 text-sm text-[#5a5a5a]">
              لا توجد إشعارات جديدة من الفرز حالياً. آخر معاملات صادرة:{" "}
              {incomingFromSorting.length} — راجع{" "}
              <Link href="/coordinator/incoming" className="font-medium text-[#7C3AED] hover:underline">
                المعاملات الواردة
              </Link>
              .
            </p>
          )}
        </>
      )}

      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white px-6 py-4 shadow-sm">
        <p className="text-sm text-[#5a5a5a]">
          المعاملات المحوّلة للمخولين تظهر في تبويب{" "}
          <Link
            href="/coordinator/delegates"
            className="font-medium text-[#1B1B1B] underline decoration-[#1E6B3A]/60 hover:decoration-[#1E6B3A]"
          >
            متابعة المخولين
          </Link>{" "}
          — الحالة: لدى المخول.
        </p>
      </article>
    </div>
  );
}
