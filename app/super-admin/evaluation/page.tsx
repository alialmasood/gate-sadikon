"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const BORDER_RADIUS = "rounded-xl";
const CARD_BG = "bg-white";
const BORDER_COLOR = "border-[#c9d6e3]";
const OFFICIAL_BG = "bg-[#f0f4f8]";
const ACCENT_NAVY = "#1e3a5f";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير مكتب",
  RECEPTION: "استقبال",
  COORDINATOR: "تنسيق ومتابعة",
  SORTING: "فرز",
  DOCUMENTATION: "توثيق",
  USER: "مخول",
  AUDITOR: "مدقق",
  PARLIAMENT_MEMBER: "عضو مجلس",
};

const MONTH_OPTIONS = [
  { value: "01", label: "يناير" }, { value: "02", label: "فبراير" }, { value: "03", label: "مارس" },
  { value: "04", label: "أبريل" }, { value: "05", label: "مايو" }, { value: "06", label: "يونيو" },
  { value: "07", label: "يوليو" }, { value: "08", label: "أغسطس" }, { value: "09", label: "سبتمبر" },
  { value: "10", label: "أكتوبر" }, { value: "11", label: "نوفمبر" }, { value: "12", label: "ديسمبر" },
];

type TransactionRow = {
  id: string;
  serialNumber: string | null;
  citizenName: string | null;
  duration: string;
};

type EvaluationData = { rating: number | null; notes: string | null; evaluatedAt: string; period?: string } | null;

type EvalHistoryItem = { period: string; rating: number | null; notes: string | null; evaluatedAt: string };

type OfficeRow = {
  id: string;
  name: string;
  type: string | null;
  transactionCount: number;
  avgDuration: string;
  transactions: TransactionRow[];
  evaluation: EvaluationData;
  evaluationHistory: EvalHistoryItem[];
};

type DelegateRow = {
  id: string;
  name: string;
  officeName: string | null;
  transactionCount: number;
  avgDuration: string;
  transactions: TransactionRow[];
  evaluation: EvaluationData;
  evaluationHistory: EvalHistoryItem[];
};

type AccountRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  officeName: string | null;
  isDelegate: boolean;
  isAdmin: boolean;
  transactionCount: number;
  avgDuration: string;
  evaluation: EvaluationData;
  evaluationHistory: EvalHistoryItem[];
};

type ApiData = {
  period: string;
  periodLabel: string;
  offices: OfficeRow[];
  delegates: DelegateRow[];
  accounts: AccountRow[];
  topOffices: OfficeRow[];
  topDelegates: DelegateRow[];
  topAdmins: AccountRow[];
  chartOffices: { name: string; value: number }[];
  chartDelegates: { name: string; value: number }[];
  chartAdmins: { name: string; value: number }[];
};

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatPeriodLabel(period: string): string {
  const [y, m] = period.split("-");
  const monthNames: Record<string, string> = {
    "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل", "05": "مايو", "06": "يونيو",
    "07": "يوليو", "08": "أغسطس", "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
  };
  return `${monthNames[m] || m} ${y}`;
}

function formatDate(s: string): string {
  try {
    return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "short", numberingSystem: "arab" }).format(new Date(s));
  } catch {
    return s;
  }
}

function EntityEvaluationCard({
  entityType,
  entityId,
  period,
  evaluation,
  evaluationHistory,
  onSave,
  saving,
}: {
  entityType: "OFFICE" | "DELEGATE" | "USER";
  entityId: string;
  period: string;
  evaluation: EvaluationData;
  evaluationHistory: EvalHistoryItem[];
  onSave: (rating: number | null, notes: string) => void;
  saving: boolean;
}) {
  const [rating, setRating] = useState(evaluation?.rating ?? 0);
  const [notes, setNotes] = useState(evaluation?.notes ?? "");

  useEffect(() => {
    setRating(evaluation?.rating ?? 0);
    setNotes(evaluation?.notes ?? "");
  }, [evaluation]);

  const handleSave = () => {
    onSave(rating >= 1 && rating <= 5 ? rating : null, notes.trim());
  };

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
      <p className="mb-2 text-xs font-medium text-[#5a6c7d]">
        التقييم الشهري — {formatPeriodLabel(period)}
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(rating === n ? 0 : n)}
            className={`h-8 w-8 rounded-lg text-sm font-bold transition ${
              rating >= n ? "bg-[#1E6B3A] text-white" : "bg-[#e5e7eb] text-[#5a5a5a] hover:bg-[#d1d5db]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="ملاحظات (اختياري)..."
        rows={2}
        className="mb-2 w-full rounded-lg border border-[#c9d6e3] bg-white px-3 py-2 text-sm text-[#1B1B1B] placeholder:text-[#9ca3af] focus:border-[#1e3a5f]/50 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/20"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-[#1e3a5f] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#152d47] disabled:opacity-60"
      >
        {saving ? "جاري الحفظ…" : "حفظ التقييم"}
      </button>
      {evaluation?.evaluatedAt && (
        <p className="mt-1 text-[10px] text-[#5a5a5a]">آخر تحديث: {formatDate(evaluation.evaluatedAt)}</p>
      )}
      {evaluationHistory.length > 1 && (
        <div className="mt-3 border-t border-[#e5e7eb] pt-2">
          <p className="mb-1 text-[10px] font-medium text-[#5a5a5a]">سجل التقييمات السابقة:</p>
          <div className="space-y-0.5 text-[10px] text-[#5a5a5a]">
            {evaluationHistory.filter((h) => h.period !== period).slice(0, 5).map((h) => (
              <div key={h.period} className="flex justify-between gap-2">
                <span>{formatPeriodLabel(h.period)}</span>
                <span className="font-medium">★ {h.rating ?? "—"}/5</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EvaluationPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(getCurrentPeriod);
  const [activeTab, setActiveTab] = useState<"offices" | "delegates" | "accounts">("offices");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/evaluation?period=${period}`, { credentials: "include" });
      if (res.ok) setData(await res.json());
      else setData(null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveEvaluation = useCallback(
    async (entityType: "OFFICE" | "DELEGATE" | "USER", entityId: string, rating: number | null, notes: string) => {
      const key = `${entityType}:${entityId}`;
      setSavingKey(key);
      try {
        const res = await fetch("/api/super-admin/evaluation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ entityType, entityId, period, rating, notes }),
        });
        if (res.ok) {
          await loadData();
        }
      } finally {
        setSavingKey(null);
      }
    },
    [period, loadData]
  );

  const filterBySearch = <T extends { name: string; officeName?: string | null; email?: string; type?: string | null }>(
    items: T[]
  ) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter(
      (x) =>
        x.name.toLowerCase().includes(q) ||
        (x.officeName ?? "").toLowerCase().includes(q) ||
        (x.email ?? "").toLowerCase().includes(q) ||
        (x.type ?? "").toLowerCase().includes(q)
    );
  };

  const offices = data ? filterBySearch(data.offices) : [];
  const delegates = data ? filterBySearch(data.delegates) : [];
  const accounts = data ? filterBySearch(data.accounts) : [];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className={`min-h-screen ${OFFICIAL_BG} pb-8`} dir="rtl">
      {/* ترويسة */}
      <div className={`mb-6 ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} px-5 py-5 shadow-sm sm:mb-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">نظام التقييم الشهري</h1>
            <p className="mt-1 text-sm text-[#5a6c7d]">
              تقييم يدوي شهري — يحفظ كل التقييمات حسب الفترة لمراجعة الأداء عبر الزمن
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={`${BORDER_RADIUS} border border-[#c9d6e3] bg-white px-3 py-2 text-base text-[#1e3a5f] focus:border-[#1e3a5f]/50 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20`}
            >
              {years.flatMap((y) =>
                MONTH_OPTIONS.map((m) => {
                  const val = `${y}-${m.value}`;
                  return (
                    <option key={val} value={val}>
                      {m.label} {y}
                    </option>
                  );
                })
              )}
            </select>
            <button
              type="button"
              onClick={() => loadData()}
              className="flex items-center gap-2 rounded-xl border border-[#c9d6e3] bg-white px-4 py-2 text-base font-medium text-[#1e3a5f] transition hover:bg-[#f0f4f8]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              تحديث
            </button>
          </div>
        </div>
      </div>

      {/* بطاقات الأوائل */}
      {data && (data.topOffices.length > 0 || data.topDelegates.length > 0 || data.topAdmins.length > 0) && (
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className={`${BORDER_RADIUS} border-2 border-[#1E6B3A]/30 bg-[#1E6B3A]/5 p-4 shadow-sm`}>
            <h3 className="mb-3 text-sm font-bold text-[#1e3a5f]">أفضل المكاتب ({data.periodLabel})</h3>
            {data.topOffices.length === 0 ? (
              <p className="text-sm text-[#5a5a5a]">لا توجد تقييمات بعد</p>
            ) : (
              <ul className="space-y-2">
                {data.topOffices.slice(0, 5).map((o, i) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2">
                    <span className="font-medium text-[#1B1B1B]">{o.name}</span>
                    <span className="rounded-lg bg-[#1E6B3A]/20 px-2 py-0.5 text-sm font-bold text-[#1E6B3A]">
                      ★ {o.evaluation?.rating}/5
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`${BORDER_RADIUS} border-2 border-[#B08D57]/30 bg-[#B08D57]/5 p-4 shadow-sm`}>
            <h3 className="mb-3 text-sm font-bold text-[#1e3a5f]">أفضل المخولين ({data.periodLabel})</h3>
            {data.topDelegates.length === 0 ? (
              <p className="text-sm text-[#5a5a5a]">لا توجد تقييمات بعد</p>
            ) : (
              <ul className="space-y-2">
                {data.topDelegates.slice(0, 5).map((d, i) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2">
                    <span className="font-medium text-[#1B1B1B]">{d.name}</span>
                    <span className="rounded-lg bg-[#B08D57]/20 px-2 py-0.5 text-sm font-bold text-[#8B6914]">
                      ★ {d.evaluation?.rating}/5
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`${BORDER_RADIUS} border-2 border-[#1e3a5f]/30 bg-[#1e3a5f]/5 p-4 shadow-sm`}>
            <h3 className="mb-3 text-sm font-bold text-[#1e3a5f]">أفضل الإداريين ({data.periodLabel})</h3>
            {data.topAdmins.length === 0 ? (
              <p className="text-sm text-[#5a5a5a]">لا توجد تقييمات بعد</p>
            ) : (
              <ul className="space-y-2">
                {data.topAdmins.slice(0, 5).map((a, i) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2">
                    <span className="font-medium text-[#1B1B1B]">{a.name}</span>
                    <span className="rounded-lg bg-[#1e3a5f]/20 px-2 py-0.5 text-sm font-bold text-[#1e3a5f]">
                      ★ {a.evaluation?.rating}/5
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ألسنة التبويب */}
      <div className={`mb-6 ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} p-2 shadow-sm`}>
        <div className="flex flex-wrap gap-2">
          {(["offices", "delegates", "accounts"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`${BORDER_RADIUS} px-4 py-2 text-base font-medium transition ${
                activeTab === tab ? "bg-[#1e3a5f] text-white" : "border border-[#c9d6e3] bg-white text-[#1e3a5f] hover:bg-[#f0f4f8]"
              }`}
            >
              {tab === "offices" && "المكاتب"}
              {tab === "delegates" && "المخولون"}
              {tab === "accounts" && "الحسابات"}
            </button>
          ))}
        </div>
      </div>

      {/* بحث */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="بحث بالاسم أو المكتب أو البريد..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${BORDER_RADIUS} w-full max-w-md border border-[#c9d6e3] bg-white px-4 py-2.5 text-base text-[#1B1B1B] placeholder:text-[#9ca3af] focus:border-[#1e3a5f]/50 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20`}
        />
      </div>

      {loading ? (
        <div className="flex py-16 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a5f]/30 border-t-[#1e3a5f]" />
        </div>
      ) : activeTab === "offices" ? (
        <section className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
          <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-4">
            <h2 className="text-lg font-bold text-[#1e3a5f]">المكاتب والمعاملات</h2>
            <p className="mt-0.5 text-sm text-[#5a6c7d]">الفترة: {data?.periodLabel} — التقييم شهري ويُحفظ لكل فترة</p>
          </div>
          {offices.length === 0 ? (
            <p className="py-12 text-center text-[#5a5a5a]">لا توجد مكاتب</p>
          ) : (
            <div className="overflow-x-auto">
              {offices.map((o) => (
                <div key={o.id} className="border-b border-[#e5e7eb] last:border-b-0">
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-[#f8fafc] cursor-pointer"
                    onClick={() => setExpandedId(expandedId === `O:${o.id}` ? null : `O:${o.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-[#1B1B1B]">{o.name}</span>
                      <span className="text-sm text-[#5a5a5a]">{o.type || "—"}</span>
                      <span className="rounded-full bg-[#1E6B3A]/15 px-2.5 py-0.5 text-sm font-medium text-[#1E6B3A]">
                        {o.transactionCount} معاملة
                      </span>
                      <span className="text-sm text-[#5a5a5a]">متوسط الإنجاز: {o.avgDuration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {o.evaluation?.rating != null && (
                        <span className="rounded-lg bg-[#B08D57]/20 px-2 py-1 text-sm font-medium text-[#8B6914]">
                          ★ {o.evaluation.rating}/5 ({data?.periodLabel})
                        </span>
                      )}
                      <svg
                        className={`h-5 w-5 text-[#5a5a5a] transition ${expandedId === `O:${o.id}` ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {expandedId === `O:${o.id}` && (
                    <div className="border-t border-[#e5e7eb] bg-[#fafafa] p-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <h3 className="mb-2 text-sm font-semibold text-[#1e3a5f]">المعاملات المنجزة (عينة)</h3>
                          {o.transactions.length === 0 ? (
                            <p className="py-4 text-sm text-[#5a5a5a]">لا توجد معاملات منجزة</p>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white">
                              <table className="w-full min-w-[300px] text-right text-sm">
                                <thead>
                                  <tr className="border-b border-[#e5e7eb] bg-[#f8fafc]">
                                    <th className="py-2 px-2">الرقم</th>
                                    <th className="py-2 px-2">المواطن</th>
                                    <th className="py-2 px-2">فترة الإنجاز</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {o.transactions.map((t) => (
                                    <tr key={t.id} className="border-b border-[#e5e7eb]/60 last:border-0">
                                      <td className="py-2 px-2 font-mono text-[#1E6B3A]">{t.serialNumber || "—"}</td>
                                      <td className="py-2 px-2">{t.citizenName || "—"}</td>
                                      <td className="py-2 px-2 font-medium">{t.duration}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                        <div>
                          <EntityEvaluationCard
                            entityType="OFFICE"
                            entityId={o.id}
                            period={period}
                            evaluation={o.evaluation}
                            evaluationHistory={o.evaluationHistory}
                            onSave={(rating, notes) => handleSaveEvaluation("OFFICE", o.id, rating, notes)}
                            saving={savingKey === `OFFICE:${o.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : activeTab === "delegates" ? (
        <section className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
          <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-4">
            <h2 className="text-lg font-bold text-[#1e3a5f]">المخولون والمعاملات</h2>
            <p className="mt-0.5 text-sm text-[#5a6c7d]">الفترة: {data?.periodLabel} — التقييم شهري ويُحفظ لكل فترة</p>
          </div>
          {delegates.length === 0 ? (
            <p className="py-12 text-center text-[#5a5a5a]">لا يوجد مخولون</p>
          ) : (
            <div className="overflow-x-auto">
              {delegates.map((d) => (
                <div key={d.id} className="border-b border-[#e5e7eb] last:border-b-0">
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-[#f8fafc] cursor-pointer"
                    onClick={() => setExpandedId(expandedId === `D:${d.id}` ? null : `D:${d.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-[#1B1B1B]">{d.name}</span>
                      <span className="text-sm text-[#5a5a5a]">{d.officeName || "—"}</span>
                      <span className="rounded-full bg-[#1E6B3A]/15 px-2.5 py-0.5 text-sm font-medium text-[#1E6B3A]">
                        {d.transactionCount} معاملة
                      </span>
                      <span className="text-sm text-[#5a5a5a]">متوسط الإنجاز: {d.avgDuration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.evaluation?.rating != null && (
                        <span className="rounded-lg bg-[#B08D57]/20 px-2 py-1 text-sm font-medium text-[#8B6914]">
                          ★ {d.evaluation.rating}/5 ({data?.periodLabel})
                        </span>
                      )}
                      <svg
                        className={`h-5 w-5 text-[#5a5a5a] transition ${expandedId === `D:${d.id}` ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {expandedId === `D:${d.id}` && (
                    <div className="border-t border-[#e5e7eb] bg-[#fafafa] p-4">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <h3 className="mb-2 text-sm font-semibold text-[#1e3a5f]">المعاملات المنجزة (عينة)</h3>
                          {d.transactions.length === 0 ? (
                            <p className="py-4 text-sm text-[#5a5a5a]">لا توجد معاملات منجزة</p>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white">
                              <table className="w-full min-w-[300px] text-right text-sm">
                                <thead>
                                  <tr className="border-b border-[#e5e7eb] bg-[#f8fafc]">
                                    <th className="py-2 px-2">الرقم</th>
                                    <th className="py-2 px-2">المواطن</th>
                                    <th className="py-2 px-2">فترة الإنجاز</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {d.transactions.map((t) => (
                                    <tr key={t.id} className="border-b border-[#e5e7eb]/60 last:border-0">
                                      <td className="py-2 px-2 font-mono text-[#1E6B3A]">{t.serialNumber || "—"}</td>
                                      <td className="py-2 px-2">{t.citizenName || "—"}</td>
                                      <td className="py-2 px-2 font-medium">{t.duration}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                        <div>
                          <EntityEvaluationCard
                            entityType="DELEGATE"
                            entityId={d.id}
                            period={period}
                            evaluation={d.evaluation}
                            evaluationHistory={d.evaluationHistory}
                            onSave={(rating, notes) => handleSaveEvaluation("DELEGATE", d.id, rating, notes)}
                            saving={savingKey === `DELEGATE:${d.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className={`${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
          <div className="border-b border-[#c9d6e3] bg-[#f8fafc] px-5 py-4">
            <h2 className="text-lg font-bold text-[#1e3a5f]">الحسابات (المستخدمون)</h2>
            <p className="mt-0.5 text-sm text-[#5a6c7d]">الفترة: {data?.periodLabel} — التقييم شهري ويُحفظ لكل فترة</p>
          </div>
          {accounts.length === 0 ? (
            <p className="py-12 text-center text-[#5a5a5a]">لا توجد حسابات</p>
          ) : (
            <div className="overflow-x-auto">
              {accounts.map((a) => (
                <div key={a.id} className="border-b border-[#e5e7eb] last:border-b-0">
                  <div
                    className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-[#f8fafc] cursor-pointer"
                    onClick={() => setExpandedId(expandedId === `U:${a.id}` ? null : `U:${a.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-[#1B1B1B]">{a.name}</span>
                      <span className="text-sm text-[#5a5a5a]">{a.email}</span>
                      <span className="rounded-lg bg-[#1e3a5f]/10 px-2 py-0.5 text-xs font-medium text-[#1e3a5f]">
                        {ROLE_LABELS[a.role] || a.role}
                      </span>
                      <span className="text-sm text-[#5a5a5a]">{a.officeName || "—"}</span>
                      {a.isDelegate && (
                        <span className="rounded-full bg-[#1E6B3A]/15 px-2.5 py-0.5 text-sm font-medium text-[#1E6B3A]">
                          {a.transactionCount} معاملة منجزة
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {a.evaluation?.rating != null && (
                        <span className="rounded-lg bg-[#B08D57]/20 px-2 py-1 text-sm font-medium text-[#8B6914]">
                          ★ {a.evaluation.rating}/5 ({data?.periodLabel})
                        </span>
                      )}
                      <svg
                        className={`h-5 w-5 text-[#5a5a5a] transition ${expandedId === `U:${a.id}` ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {expandedId === `U:${a.id}` && (
                    <div className="border-t border-[#e5e7eb] bg-[#fafafa] p-4">
                      <EntityEvaluationCard
                        entityType="USER"
                        entityId={a.id}
                        period={period}
                        evaluation={a.evaluation}
                        evaluationHistory={a.evaluationHistory}
                        onSave={(rating, notes) => handleSaveEvaluation("USER", a.id, rating, notes)}
                        saving={savingKey === `USER:${a.id}`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* مخططات المقارنة */}
      {data && (data.chartOffices.length > 0 || data.chartDelegates.length > 0 || data.chartAdmins.length > 0) && (
        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className={`flex flex-col ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
            <div className="shrink-0 border-b border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <h3 className="text-base font-bold text-[#1e3a5f]">أفضل المكاتب — {data.periodLabel}</h3>
            </div>
            <div className="flex-1 p-4 pt-4">
              {data.chartOffices.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#5a5a5a]">لا توجد بيانات</p>
              ) : (
                <div className="min-h-[220px] w-full" style={{ minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={220} minHeight={220}>
                    <BarChart data={data.chartOffices} layout="vertical" margin={{ top: 12, right: 12, left: 4, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" vertical={false} />
                    <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={135} tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} />
                    <Tooltip formatter={(v: number | undefined) => [`★ ${v ?? 0}/5`, "التقييم"]} />
                    <Bar dataKey="value" fill="#1E6B3A" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
          <div className={`flex flex-col ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
            <div className="shrink-0 border-b border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <h3 className="text-base font-bold text-[#1e3a5f]">أفضل المخولين — {data.periodLabel}</h3>
            </div>
            <div className="flex-1 p-4 pt-4">
              {data.chartDelegates.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#5a5a5a]">لا توجد بيانات</p>
              ) : (
                <div className="min-h-[220px] w-full" style={{ minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={220} minHeight={220}>
                    <BarChart data={data.chartDelegates} layout="vertical" margin={{ top: 12, right: 12, left: 4, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" vertical={false} />
                    <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={135} tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} />
                    <Tooltip formatter={(v: number | undefined) => [`★ ${v ?? 0}/5`, "التقييم"]} />
                    <Bar dataKey="value" fill="#B08D57" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
          <div className={`flex flex-col ${BORDER_RADIUS} border ${BORDER_COLOR} ${CARD_BG} overflow-hidden shadow-sm`}>
            <div className="shrink-0 border-b border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <h3 className="text-base font-bold text-[#1e3a5f]">أفضل الإداريين — {data.periodLabel}</h3>
            </div>
            <div className="flex-1 p-4 pt-4">
              {data.chartAdmins.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#5a5a5a]">لا توجد بيانات</p>
              ) : (
                <div className="min-h-[220px] w-full" style={{ minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={220} minHeight={220}>
                    <BarChart data={data.chartAdmins} layout="vertical" margin={{ top: 12, right: 12, left: 4, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" vertical={false} />
                    <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={135} tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} />
                    <Tooltip formatter={(v: number | undefined) => [`★ ${v ?? 0}/5`, "التقييم"]} />
                    <Bar dataKey="value" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
