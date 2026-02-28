"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Stats = {
  officeName: string;
  transactionsToday: number;
  totalTransactions: number;
  doneTransactions: number;
  overdueCount: number;
  completionRate: number;
};

type TimelinePoint = { date: string; count: number };
type StatusPoint = { name: string; value: number; fill: string };
type ActivityItem = {
  id: string;
  citizenName: string | null;
  status: string;
  actionType: string;
  executor: string;
  createdAt: string;
  completedAt: string | null;
};

type SectionUser = { id: string; name: string; email: string; role: string; roleLabel: string };
type SectionDelegate = { id: string; name: string; total: number; done: number; rate: number };
type SectionStat = { section: string; summary: string };
type UrgentItem = {
  id: string;
  citizenName: string | null;
  transactionType: string | null;
  serialNumber: string | null;
  formationName: string | null;
  createdAt: string;
  updatedAt: string;
};

type FullTx = {
  citizenName?: string | null;
  citizenPhone?: string | null;
  citizenAddress?: string | null;
  citizenMinistry?: string | null;
  citizenDepartment?: string | null;
  citizenOrganization?: string | null;
  transactionType?: string | null;
  transactionTitle?: string | null;
  formationName?: string | null;
  subDeptName?: string | null;
  officeName?: string | null;
  serialNumber?: string | null;
  followUpUrl?: string | null;
  submissionDate?: string | null;
  createdAt?: string | null;
  attachments?: { url: string; name?: string }[] | null;
};

type DelegateOpt = { id: string; name: string; isSuggested?: boolean };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
};

function formatDate(d: string) {
  return new Intl.DateTimeFormat("ar-IQ", { month: "short", day: "numeric", numberingSystem: "arab" }).format(new Date(d));
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [statusData, setStatusData] = useState<StatusPoint[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [sectionsData, setSectionsData] = useState<{ users: SectionUser[]; delegates: SectionDelegate[]; sectionStats?: SectionStat[] } | null>(null);
  const [urgentList, setUrgentList] = useState<UrgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTx, setActionTx] = useState<UrgentItem | null>(null);
  const [actionStep, setActionStep] = useState<"menu" | "view" | "transfer" | "complete">("menu");
  const [fullTx, setFullTx] = useState<FullTx | null>(null);
  const [delegates, setDelegates] = useState<DelegateOpt[]>([]);
  const [selectedDelegateId, setSelectedDelegateId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const closeActionModal = useCallback(() => {
    setActionTx(null);
    setActionStep("menu");
    setFullTx(null);
    setDelegates([]);
    setSelectedDelegateId("");
    setActionError("");
  }, []);

  const loadUrgent = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/urgent", { credentials: "include" });
      if (res.ok) setUrgentList(await res.json());
    } catch {
      //
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, timelineRes, statusRes, activityRes, sectionsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/charts?chart=timeline&period=months:30"),
        fetch("/api/admin/charts?chart=status"),
        fetch("/api/admin/charts?chart=activity"),
        fetch("/api/admin/sections-summary"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      loadUrgent();
      if (timelineRes.ok) setTimelineData(await timelineRes.json());
      if (statusRes.ok) setStatusData(await statusRes.json());
      if (activityRes.ok) setActivity(await activityRes.json());
      if (sectionsRes.ok) setSectionsData(await sectionsRes.json());
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadUrgent();
    const interval = setInterval(loadUrgent, 12000);
    return () => clearInterval(interval);
  }, [loadUrgent]);

  const statCards = stats
    ? [
        { label: "معاملات اليوم", value: stats.transactionsToday, borderColor: "border-r-[#1E6B3A]" },
        { label: "إجمالي المعاملات", value: stats.totalTransactions, borderColor: "border-r-[#5B7C99]" },
        { label: "المنجزة", value: stats.doneTransactions, borderColor: "border-r-[#0f766e]" },
        { label: "المتأخرة", value: stats.overdueCount, borderColor: "border-r-[#b91c1c]" },
      ]
    : [];

  return (
    <div className="space-y-6" dir="rtl">
      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-[#1B1B1B]">لوحة تحكم مدير المكتب</h1>
            <p className="mt-1 text-sm text-[#5a5a5a]">
              مرحباً، {stats?.officeName ?? "مدير المكتب"} — نظرة عامة على نشاط المكتب
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] transition hover:bg-[#f6f3ed] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A] disabled:opacity-60"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث البيانات
          </button>
        </div>
      </article>

      {/* المعاملات العاجلة */}
      {urgentList.length > 0 && (
        <article className="overflow-hidden rounded-2xl border border-amber-300 bg-amber-50/50 shadow-sm">
          <div className="border-b border-amber-200 bg-amber-100/70 px-6 py-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-amber-800">
              <span className="text-lg">⚠️</span>
              معاملات عاجلة تتطلب إجراء
            </h2>
            <p className="mt-0.5 text-sm text-amber-700">تم استلامها من قسم الفرز — تتحدّث تلقائياً</p>
          </div>
          <div className="divide-y divide-amber-200/60 p-4">
            {urgentList.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1B1B1B]">
                    معاملة عاجلة — الجهة/التشكيل:{" "}
                    <span className="text-amber-800">{u.formationName || "—"}</span> — تم استلامها بتاريخ{" "}
                    <span className="text-[#5a5a5a]">
                      {new Date(u.updatedAt).toLocaleDateString("ar-IQ", {
                        dateStyle: "medium",
                        numberingSystem: "arab",
                      })}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-[#5a5a5a]">
                    {u.citizenName || "—"} — {u.transactionType || "—"} {u.serialNumber ? `(${u.serialNumber})` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActionTx(u);
                    setActionStep("menu");
                    setActionError("");
                  }}
                  className="shrink-0 rounded-lg border border-amber-400 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200 transition"
                >
                  اتخاذ إجراء
                </button>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* نسبة الإنجاز */}
      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
          <h2 className="text-base font-semibold text-[#1B1B1B]">نسبة الإنجاز</h2>
          <p className="mt-0.5 text-sm text-[#5a5a5a]">نسبة إنجاز المعاملات بالنسبة لإجمالي المعاملات</p>
        </div>
        <div className="flex items-center justify-between px-6 py-6">
          <div>
            <p className="text-3xl font-bold text-[#1E6B3A]">{(stats?.completionRate ?? 0)}%</p>
          </div>
          <div className="relative h-20 w-20">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" stroke="#e5e5e5" strokeWidth="3" fill="none" />
              <circle
                cx="18"
                cy="18"
                r="14"
                stroke="#1E6B3A"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 14}
                strokeDashoffset={2 * Math.PI * 14 * (1 - (stats?.completionRate ?? 0) / 100)}
              />
            </svg>
          </div>
        </div>
      </article>

      {/* بطاقات الإحصائيات */}
      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
          <h2 className="text-base font-semibold text-[#1B1B1B]">إحصائيات المعاملات</h2>
          <p className="mt-0.5 text-sm text-[#5a5a5a]">ملخص إحصائي لنشاط المعاملات في المكتب</p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading && !stats
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl border border-[#d4cfc8] bg-[#f6f3ed]" />
              ))
            : statCards.map((card) => (
                <div
                  key={card.label}
                  className={`flex flex-col rounded-xl border border-[#d4cfc8] bg-white p-4 shadow-sm ${card.borderColor} border-r-4`}
                >
                  <p className="text-sm font-medium text-[#5a5a5a]">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{card.value}</p>
                </div>
              ))}
        </div>
      </article>

      {/* نبذة عن عمل وإنجاز الأقسام التابعة للمكتب */}
      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
          <h2 className="text-base font-semibold text-[#1B1B1B]">نبذة عن عمل وإنجاز الأقسام التابعة للمكتب</h2>
          <p className="mt-0.5 text-sm text-[#5a5a5a]">الحسابات المرتبطة بالمكتب — ما أنجز كل حساب من إجمالي المعاملات المعينة له</p>
        </div>
        <div className="p-6">
          {loading ? (
            <p className="py-8 text-center text-[#5a5a5a]">جاري التحميل…</p>
          ) : (
            <div className="space-y-8">
              {sectionsData?.sectionStats && sectionsData.sectionStats.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-[#1B1B1B]">إنجازات الأقسام</h3>
                  <ul className="space-y-2 rounded-lg border border-[#d4cfc8] bg-[#f6f3ed]/30 p-4">
                    {sectionsData.sectionStats.map((s, i) => (
                      <li key={i} className="flex flex-wrap items-baseline gap-2 text-sm">
                        <span className="font-medium text-[#1B1B1B]">{s.section}:</span>
                        <span className="text-[#5a5a5a]">{s.summary}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-[#1B1B1B]">الحسابات والأدوار</h3>
                {!sectionsData?.users?.length ? (
                  <p className="text-sm text-[#5a5a5a]">لا توجد حسابات مرتبطة بالمكتب</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px] text-right text-sm">
                      <thead>
                        <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                          <th className="border-l border-[#d4cfc8] py-2 px-3 font-medium text-[#5a5a5a]">الاسم</th>
                          <th className="border-l border-[#d4cfc8] py-2 px-3 font-medium text-[#5a5a5a]">البريد</th>
                          <th className="py-2 px-3 font-medium text-[#5a5a5a]">الدور / القسم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionsData.users.map((u) => (
                          <tr key={u.id} className="border-b border-[#d4cfc8]/80">
                            <td className="border-l border-[#d4cfc8]/60 py-2 px-3 font-medium text-[#1B1B1B]">{u.name}</td>
                            <td className="border-l border-[#d4cfc8]/60 py-2 px-3 text-[#5a5a5a]">{u.email}</td>
                            <td className="py-2 px-3 text-[#1B1B1B]">{u.roleLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-[#1B1B1B]">إنجاز المخولين</h3>
                <p className="mb-3 text-xs text-[#5a5a5a]">المخولون الذين تُعيّن لهم المعاملات — إجمالي المعاملات المعينة لكل مخول وعدد ما أُنْجِز منها</p>
                {!sectionsData?.delegates?.length ? (
                  <p className="text-sm text-[#5a5a5a]">لا يوجد مخولون مسجلون أو لا توجد معاملات معينة</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px] text-right text-sm">
                      <thead>
                        <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                          <th className="border-l border-[#d4cfc8] py-2 px-3 font-medium text-[#5a5a5a]">المخول</th>
                          <th className="border-l border-[#d4cfc8] py-2 px-3 font-medium text-[#5a5a5a]">إجمالي المعاملات</th>
                          <th className="border-l border-[#d4cfc8] py-2 px-3 font-medium text-[#5a5a5a]">المنجزة</th>
                          <th className="py-2 px-3 font-medium text-[#5a5a5a]">نسبة الإنجاز</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionsData.delegates.map((d) => (
                          <tr key={d.id} className="border-b border-[#d4cfc8]/80">
                            <td className="border-l border-[#d4cfc8]/60 py-2 px-3 font-medium text-[#1B1B1B]">{d.name}</td>
                            <td className="border-l border-[#d4cfc8]/60 py-2 px-3 text-[#1B1B1B]">{d.total}</td>
                            <td className="border-l border-[#d4cfc8]/60 py-2 px-3 text-[#1E6B3A] font-medium">{d.done}</td>
                            <td className="py-2 px-3">
                              <span className="inline-block rounded-full bg-[#1E6B3A]/10 px-2 py-0.5 text-xs font-medium text-[#1E6B3A]">
                                {d.rate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </article>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* رسم المعاملات */}
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
            <h2 className="text-base font-semibold text-[#1B1B1B]">المعاملات خلال 30 يوم</h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">رسم بياني لتوزيع المعاملات خلال الشهر الماضي</p>
          </div>
          <div className="h-64 px-6 py-4">
            {loading ? (
              <div className="flex h-full items-center justify-center text-[#5a5a5a]">جاري التحميل…</div>
            ) : timelineData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[#5a5a5a]">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1E6B3A" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1E6B3A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number | undefined) => [v ?? 0, "معاملة"]}
                    labelFormatter={(l) => formatDate(l)}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #d4cfc8" }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#1E6B3A" strokeWidth={2} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        {/* توزيع الحالة */}
        <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
          <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
            <h2 className="text-base font-semibold text-[#1B1B1B]">توزيع المعاملات حسب الحالة</h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">توزيع المعاملات بين قيد التنفيذ والمنجزة والمتأخرة</p>
          </div>
          <div className="flex h-64 items-center justify-center px-6 py-4">
            {loading ? (
              <p className="text-[#5a5a5a]">جاري التحميل…</p>
            ) : statusData.length === 0 || statusData.every((s) => s.value === 0) ? (
              <p className="text-[#5a5a5a]">لا توجد معاملات</p>
            ) : (
              <PieChart width={280} height={240}>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={statusData[i].fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number | undefined, n: string | undefined, p: { payload?: { name?: string } }) => [v ?? 0, p?.payload?.name ?? n ?? ""]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #d4cfc8", backgroundColor: "#FAFAF9" }}
                />
                <Legend />
              </PieChart>
            )}
          </div>
        </article>
      </div>

      {/* آخر النشاط */}
      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
          <div>
            <h2 className="text-base font-semibold text-[#1B1B1B]">آخر المعاملات</h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">أحدث المعاملات المسجلة في النظام</p>
          </div>
          <Link
            href="/admin/transactions"
            className="rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-3 py-2 text-sm font-medium text-[#1E6B3A] transition hover:bg-[#1E6B3A]/20"
          >
            عرض الكل
          </Link>
        </div>
        {loading ? (
          <p className="py-12 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : activity.length === 0 ? (
          <p className="py-12 text-center text-[#5a5a5a]">لا توجد معاملات حديثة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-right text-sm">
              <thead>
                <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">المواطن</th>
                  <th className="border-l border-[#d4cfc8] py-3 px-3 font-medium text-[#5a5a5a]">الحالة</th>
                  <th className="py-3 px-3 font-medium text-[#5a5a5a]">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {activity.slice(0, 8).map((a) => (
                  <tr key={a.id} className="border-b border-[#d4cfc8]/80 transition hover:bg-[#f6f3ed]/50">
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3 font-medium text-[#1B1B1B]">{a.citizenName || "—"}</td>
                    <td className="border-l border-[#d4cfc8]/60 py-3 px-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.status === "DONE"
                            ? "bg-[#1E6B3A]/20 text-[#1E6B3A]"
                            : a.status === "OVERDUE"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#5a5a5a]">
                      {new Date(a.createdAt).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short", numberingSystem: "arab" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {/* مودال اتخاذ إجراء — معاملة عاجلة */}
      {actionTx && (
        <AdminActionModal
          actionTx={actionTx}
          actionStep={actionStep}
          setActionStep={setActionStep}
          fullTx={fullTx}
          setFullTx={setFullTx}
          delegates={delegates}
          setDelegates={setDelegates}
          selectedDelegateId={selectedDelegateId}
          setSelectedDelegateId={setSelectedDelegateId}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          actionError={actionError}
          setActionError={setActionError}
          onClose={closeActionModal}
          onSuccess={() => {
            closeActionModal();
            loadUrgent();
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AdminActionModal({
  actionTx,
  actionStep,
  setActionStep,
  fullTx,
  setFullTx,
  delegates,
  setDelegates,
  selectedDelegateId,
  setSelectedDelegateId,
  actionLoading,
  setActionLoading,
  actionError,
  setActionError,
  onClose,
  onSuccess,
}: {
  actionTx: UrgentItem;
  actionStep: "menu" | "view" | "transfer" | "complete";
  setActionStep: (s: "menu" | "view" | "transfer" | "complete") => void;
  fullTx: FullTx | null;
  setFullTx: (t: FullTx | null) => void;
  delegates: DelegateOpt[];
  setDelegates: (d: DelegateOpt[]) => void;
  selectedDelegateId: string;
  setSelectedDelegateId: (s: string) => void;
  actionLoading: boolean;
  setActionLoading: (b: boolean) => void;
  actionError: string;
  setActionError: (s: string) => void;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const handleView = async () => {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/transactions/${actionTx.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFullTx(data);
        setActionStep("view");
      } else setActionError("فشل تحميل المعاملة");
    } catch {
      setActionError("حدث خطأ غير متوقع");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenTransfer = async () => {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/sorting/delegates-for-assign?transactionId=${actionTx.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDelegates((data.delegates || []).map((d: { id: string; name: string; isSuggested?: boolean }) => ({ id: d.id, name: d.name, isSuggested: d.isSuggested })));
        setSelectedDelegateId("");
        setActionStep("transfer");
      } else setActionError("فشل تحميل المخولين");
    } catch {
      setActionError("حدث خطأ غير متوقع");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedDelegateId.trim()) {
      setActionError("اختر المخول");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/transactions/${actionTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delegateId: selectedDelegateId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSuccess();
      } else setActionError(data.error || "فشل التحويل");
    } catch {
      setActionError("حدث خطأ غير متوقع");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/transactions/${actionTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "DONE", completedByAdmin: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSuccess();
      } else setActionError(data.error || "فشل الإنجاز");
    } catch {
      setActionError("حدث خطأ غير متوقع");
    } finally {
      setActionLoading(false);
    }
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const followUpUrl = fullTx?.serialNumber ? `${baseUrl}/track?sn=${fullTx.serialNumber}` : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4" dir="rtl">
      <div className="fixed inset-0 bg-black/50" onClick={() => !actionLoading && onClose()} aria-hidden />
      <div className="relative mx-auto mt-8 mb-16 max-w-2xl rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#1B1B1B]">
            {actionStep === "menu" && "اتخاذ إجراء — معاملة عاجلة"}
            {actionStep === "view" && "عرض المعاملة والمرفقات"}
            {actionStep === "transfer" && "تحويل المعاملة إلى مخول"}
            {actionStep === "complete" && "إنجاز المعاملة"}
          </h3>
          <button type="button" onClick={onClose} disabled={actionLoading} className="rounded-lg p-2 text-[#5a5a5a] hover:bg-gray-200 disabled:opacity-50" aria-label="إغلاق">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {actionError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>
        )}

        {actionStep === "menu" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleView}
              disabled={actionLoading}
              className="flex w-full items-center gap-3 rounded-xl border border-[#d4cfc8] bg-white p-4 text-right transition hover:bg-[#f6f3ed] disabled:opacity-60"
            >
              <span className="text-2xl">📄</span>
              <div>
                <p className="font-medium text-[#1B1B1B]">عرض المعاملة والمرفقات</p>
                <p className="text-sm text-[#5a5a5a]">عرض تفاصيل المعاملة والمرفقات قبل اتخاذ الإجراء</p>
              </div>
            </button>
            <button
              type="button"
              onClick={handleOpenTransfer}
              disabled={actionLoading}
              className="flex w-full items-center gap-3 rounded-xl border border-[#1E6B3A]/30 bg-[#1E6B3A]/5 p-4 text-right transition hover:bg-[#1E6B3A]/10 disabled:opacity-60"
            >
              <span className="text-2xl">👤</span>
              <div>
                <p className="font-medium text-[#1B1B1B]">تحويل المعاملة إلى مخول</p>
                <p className="text-sm text-[#5a5a5a]">سيتم إشعار قسم المتابعة — الحالة: لدى المخول</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActionStep("complete")}
              disabled={actionLoading}
              className="flex w-full items-center gap-3 rounded-xl border border-[#0f766e]/30 bg-[#ccfbf1]/50 p-4 text-right transition hover:bg-[#ccfbf1] disabled:opacity-60"
            >
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-[#1B1B1B]">إنجاز المعاملة وإكمالها</p>
                <p className="text-sm text-[#5a5a5a]">سيتم إظهار الإنجاز في قسم التوثيق وإشعار المتابعة — الحالة: منجزة</p>
              </div>
            </button>
          </div>
        )}

        {actionStep === "view" && fullTx && (
          <div className="space-y-4">
            <TransactionReceipt
              receipt={{
                citizenName: fullTx.citizenName ?? null,
                citizenPhone: fullTx.citizenPhone ?? null,
                citizenAddress: fullTx.citizenAddress ?? null,
                citizenMinistry: fullTx.citizenMinistry ?? null,
                citizenDepartment: fullTx.citizenDepartment ?? null,
                citizenOrganization: fullTx.citizenOrganization ?? null,
                transactionType: fullTx.transactionType ?? null,
                formationName: fullTx.formationName ?? null,
                subDeptName: fullTx.subDeptName ?? null,
                officeName: fullTx.officeName ?? null,
                serialNumber: fullTx.serialNumber ?? null,
                followUpUrl: followUpUrl ?? null,
                submissionDate: fullTx.submissionDate ?? null,
                createdAt: fullTx.createdAt ?? null,
              } as ReceiptData}
              mode="modal"
              onClose={() => setActionStep("menu")}
            />
            {Array.isArray(fullTx.attachments) && fullTx.attachments.length > 0 && (
              <div>
                <h4 className="mb-2 font-medium text-[#1B1B1B]">المرفقات</h4>
                <div className="space-y-2">
                  {fullTx.attachments.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-[#d4cfc8] bg-[#f6f3ed]/30 p-3 text-sm text-[#1E6B3A] hover:underline">
                      <span>📎</span> {a.name || "مرفق"}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <button type="button" onClick={() => setActionStep("menu")} className="rounded-lg border border-[#d4cfc8] px-4 py-2 text-sm font-medium hover:bg-[#f6f3ed]">
              رجوع للخيارات
            </button>
          </div>
        )}

        {actionStep === "transfer" && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-[#1B1B1B]">اختر المخول</label>
            <select
              value={selectedDelegateId}
              onChange={(e) => setSelectedDelegateId(e.target.value)}
              className="w-full rounded-lg border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]"
            >
              <option value="">— اختر المخول —</option>
              {delegates.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.isSuggested ? " (مقترح)" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#5a5a5a]">سيتم إشعار قسم المتابعة بأن المعاملة وصلت للمخول</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setActionStep("menu")} className="flex-1 rounded-lg border border-[#d4cfc8] px-4 py-2.5 font-medium hover:bg-[#f6f3ed]">
                إلغاء
              </button>
              <button type="button" onClick={handleTransfer} disabled={actionLoading || !selectedDelegateId} className="flex-1 rounded-lg bg-[#1E6B3A] px-4 py-2.5 font-medium text-white hover:bg-[#175a2e] disabled:opacity-60">
                {actionLoading ? "جاري التحويل…" : "تحويل"}
              </button>
            </div>
          </div>
        )}

        {actionStep === "complete" && (
          <div className="space-y-4">
            <p className="text-sm text-[#5a5a5a]">هل أنت متأكد من إنجاز المعاملة وإكمالها؟ سيتم إظهار الإنجاز في قسم التوثيق وإشعار قسم المتابعة.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setActionStep("menu")} className="flex-1 rounded-lg border border-[#d4cfc8] px-4 py-2.5 font-medium hover:bg-[#f6f3ed]">
                إلغاء
              </button>
              <button type="button" onClick={handleComplete} disabled={actionLoading} className="flex-1 rounded-lg bg-[#0f766e] px-4 py-2.5 font-medium text-white hover:bg-[#0d5c55] disabled:opacity-60">
                {actionLoading ? "جاري الإنجاز…" : "تأكيد الإنجاز"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
