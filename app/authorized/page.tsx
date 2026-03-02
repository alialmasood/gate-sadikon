"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getSeenTransactionIds } from "@/lib/authorized-seen";

const POLL_INTERVAL_MS = 4000;

type Transaction = {
  id: string;
  citizenName: string | null;
  transactionType: string | null;
  serialNumber: string | null;
  urgent?: boolean;
  officeName: string | null;
  createdAt: string;
};

type Stats = {
  total: number;
  completed: number;
  notCompleted: number;
  officesCount: number;
  officeNames: string[];
  distribution: { officeName: string; count: number }[];
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      dateStyle: "short",
      timeStyle: "short",
      numberingSystem: "arab",
    }).format(new Date(s));
  } catch {
    return s;
  }
}

export default function AuthorizedDashboard() {
  const { data: session } = useSession();
  const serialNumber = (session?.user as { serialNumber?: string } | undefined)?.serialNumber;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/authorized/stats", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch("/api/authorized/transactions?limit=50&excludeCompleted=true", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTransactions(data.transactions || []);
      } else if (!silent) {
        setError(data.error || "فشل تحميل المعاملات");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(false);
    loadStats();
  }, [loadData, loadStats]);

  useEffect(() => {
    const id = setInterval(() => {
      loadData(true);
      loadStats();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadData, loadStats]);

  const [seenIds, setSeenIds] = useState<Set<string>>(() => getSeenTransactionIds());
  useEffect(() => {
    const refresh = () => setSeenIds(getSeenTransactionIds());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  useEffect(() => {
    setSeenIds(getSeenTransactionIds());
  }, [transactions]);

  const urgentTransactions = transactions.filter((t) => t.urgent);
  const urgentUnseen = urgentTransactions.filter((t) => !seenIds.has(t.id));
  const otherTransactions = transactions.filter((t) => !t.urgent);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#1B1B1B] sm:text-lg">مرحباً، المخول</h2>
          <p className="mt-1 text-sm text-[#5a5a5a]">لوحة تحكم المعاملات المستلمة</p>
        </div>
        {serialNumber && (
          <span className="font-mono text-sm font-medium text-[#5a5a5a]" dir="ltr">
            {serialNumber}
          </span>
        )}
      </div>

      {/* إحصائيات */}
      {stats && (
        <div className="rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-[#1B1B1B]">إحصائيات المعاملات</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#5B7C99]/20 bg-[#5B7C99]/5 p-4">
              <p className="text-xs font-medium text-[#5a5a5a]">إجمالي المستلمة</p>
              <p className="mt-1 text-2xl font-bold text-[#5B7C99]">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-[#1E6B3A]/20 bg-[#1E6B3A]/5 p-4">
              <p className="text-xs font-medium text-[#5a5a5a]">المنجزة</p>
              <p className="mt-1 text-2xl font-bold text-[#1E6B3A]">{stats.completed}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs font-medium text-[#5a5a5a]">غير المنجزة</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{stats.notCompleted}</p>
            </div>
            <div className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/5 p-4">
              <p className="text-xs font-medium text-[#5a5a5a]">عدد المكاتب</p>
              <p className="mt-1 text-2xl font-bold text-[#7C3AED]">{stats.officesCount}</p>
            </div>
          </div>

          {stats.distribution.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-3 text-sm font-semibold text-[#1B1B1B]">توزيع المعاملات حسب المكاتب</h4>
              <div className="space-y-3">
                {stats.distribution.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 rounded-lg border border-[#d4cfc8] bg-[#f8fafc] px-4 py-3">
                    <span className="font-medium text-[#1B1B1B]">{d.officeName}</span>
                    <span className="rounded-full bg-[#5B7C99]/15 px-3 py-1 text-sm font-bold text-[#5B7C99]">
                      {d.count} معاملة
                    </span>
                  </div>
                ))}
              </div>
              {stats.officeNames.length > 0 && (
                <p className="mt-3 text-xs text-[#5a5a5a]">
                  المكاتب التي تستلم منها: {stats.officeNames.join(" • ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1E6B3A] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800">{error}</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-[#d4cfc8] bg-white p-8 text-center shadow-sm">
          <p className="text-[#5a5a5a]">لا توجد معاملات معينة إليك حالياً.</p>
        </div>
      ) : (
        <>
          {urgentUnseen.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/80 p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-bold text-amber-900">إشعارات عاجلة — معاملات جديدة</h3>
                  <p className="text-sm text-amber-800">استلمت {urgentUnseen.length} معاملة جديدة — راجع التفاصيل</p>
                </div>
              </div>
              <ul className="space-y-3">
                {urgentUnseen.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/authorized/transactions/${t.id}`}
                      className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-white p-4 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-50/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#1B1B1B]">{t.citizenName || "—"}</p>
                        <p className="mt-0.5 text-sm text-[#5a5a5a]">{t.transactionType || "—"}</p>
                      </div>
                      <div className="shrink-0 text-left">
                        <span className="font-mono text-sm font-bold text-[#1E6B3A]" dir="ltr">
                          {t.serialNumber ? `2026-${t.serialNumber}` : "—"}
                        </span>
                        <p className="text-xs text-[#5a5a5a]">{formatDate(t.createdAt)}</p>
                      </div>
                      <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
              {urgentUnseen.length > 5 && (
                <Link
                  href="/authorized/transactions"
                  className="mt-4 inline-block text-sm font-medium text-amber-800 hover:text-amber-900 hover:underline"
                >
                  عرض كل {urgentUnseen.length} معاملة عاجلة →
                </Link>
              )}
              <Link
                href="/authorized/transactions"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1E6B3A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#175a2e]"
              >
                عرض المعاملات المستلمة
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}

          {otherTransactions.length > 0 && urgentTransactions.length === 0 && (
            <div className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
              <p className="mb-4 text-sm text-[#5a5a5a]">لديك {transactions.length} معاملة معينة إليك.</p>
              <Link
                href="/authorized/transactions"
                className="inline-flex items-center gap-2 rounded-lg bg-[#1E6B3A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#175a2e]"
              >
                عرض المعاملات المستلمة
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}

          {urgentTransactions.length > 0 && otherTransactions.length > 0 && (
            <div className="rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-6">
              <p className="text-sm text-[#5a5a5a]">معاملات أخرى: {otherTransactions.length}</p>
              <Link href="/authorized/transactions" className="mt-2 text-sm font-medium text-[#1E6B3A] hover:underline">
                عرض كل المعاملات →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
