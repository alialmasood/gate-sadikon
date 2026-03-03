"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
};

const SECTION_LABELS: Record<string, string> = {
  SORTING: "قسم الفرز",
  ADMIN: "مدير المكتب",
  COORDINATOR: "المتابعة",
  RECEPTION: "الاستقبال",
  DOCUMENTATION: "التوثيق",
};

type OfficeDetail = {
  office: {
    id: string;
    name: string;
    location: string | null;
    managerName: string | null;
    managerPhone: string | null;
  };
  sections: { name: string; users: { id: string; name: string | null; email: string }[] }[];
  stats: {
    totalTransactions: number;
    todayCount: number;
    monthCount: number;
    yearCount: number;
    pendingCount: number;
    doneCount: number;
    overdueCount: number;
    delegatesCount: number;
    formationsCount: number;
  };
  delegates: {
    id: string;
    name: string;
    serialNumber: string | null;
    email: string | null;
    ministry: string | null;
    department: string | null;
    assignments: { formationName: string; subDeptName: string | null }[];
    pendingCount: number;
    doneCount: number;
  }[];
  formations: { id: string; name: string; type: string; subDepts: { id: string; name: string }[] }[];
  transactions: {
    id: string;
    citizenName: string | null;
    serialNumber: string | null;
    status: string;
    formationName: string | null;
    subDeptName: string | null;
    delegateName: string | null;
    reachedSorting: boolean;
    completedAt: string | null;
    createdAt: string;
    assignedFromSection: string | null;
  }[];
};

function getTransactionLocation(t: {
  status: string;
  reachedSorting: boolean;
  delegateName: string | null;
  assignedFromSection: string | null;
}): string {
  if (t.status === "DONE") return "منجزة";
  if (t.delegateName) return `لدى المخول: ${t.delegateName}`;
  if (t.reachedSorting) return "قسم الفرز — بانتظار التعيين";
  const sec = t.assignedFromSection ? SECTION_LABELS[t.assignedFromSection] || t.assignedFromSection : "—";
  return sec;
}

export default function SupervisorOfficeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<OfficeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/supervisor/offices/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("فشل التحميل");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("تعذر تحميل بيانات المكتب"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8" dir="rtl">
        <div className="animate-pulse rounded-xl border border-[#c9d6e3] bg-white p-8">
          <div className="h-6 w-1/3 rounded bg-[#e8ecf0]" />
          <div className="mt-4 h-4 w-1/2 rounded bg-[#e8ecf0]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800">{error || "المكتب غير موجود"}</p>
          <Link href="/supervisor/offices" className="mt-4 inline-block text-[#1E6B3A] font-medium hover:underline">
            العودة لقائمة المكاتب
          </Link>
        </div>
      </div>
    );
  }

  const { office, sections, stats, delegates, formations, transactions } = data;

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      {/* ترويسة رسمية */}
      <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm">
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #1E6B3A, #B08D57)" }}
          aria-hidden
        />
        <div className="px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="min-w-0 flex-1 text-xl font-bold text-[#1e3a5f] sm:text-2xl">{office.name}</h1>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#1E6B3A]/20 bg-gradient-to-br from-[#1E6B3A]/10 to-[#B08D57]/5 sm:hidden">
                  <svg className="h-6 w-6 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-[#5a6c7d]">
                مدير/مسؤول المكتب: <span className="font-medium text-[#1B1B1B]">{office.managerName || "—"}</span>
              </p>
              <p className="text-sm text-[#5a6c7d]">
                العنوان: <span className="text-[#1B1B1B]">{office.location || "—"}</span>
              </p>
            </div>
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center self-start rounded-xl border border-[#1E6B3A]/20 bg-gradient-to-br from-[#1E6B3A]/10 to-[#B08D57]/5 sm:flex sm:self-center">
              <svg className="h-7 w-7 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "إجمالي المعاملات", value: stats.totalTransactions, icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
          { label: "اليوم", value: stats.todayCount, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          { label: "هذا الشهر", value: stats.monthCount, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          { label: "هذه السنة", value: stats.yearCount, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#c9d6e3] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1E6B3A]/20 bg-[#1E6B3A]/5">
                <svg className="h-5 w-5 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5a6c7d]">{s.label}</p>
                <p className="text-xl font-bold text-[#1e3a5f]">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* حالة المعاملات */}
        <div className="rounded-xl border border-[#c9d6e3] bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-[#1e3a5f]">حالة المعاملات</h3>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-[#5a6c7d]">قيد التنفيذ</span>
              <span className="font-medium text-[#1B1B1B]">{stats.pendingCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5a6c7d]">منجزة</span>
              <span className="font-medium text-[#1E6B3A]">{stats.doneCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5a6c7d]">متأخرة</span>
              <span className="font-medium text-amber-600">{stats.overdueCount}</span>
            </div>
          </div>
        </div>

        {/* المخولون */}
        <div className="rounded-xl border border-[#c9d6e3] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-[#1e3a5f]">المخولون</h3>
            <span className="text-sm text-[#5a6c7d]">عدد المخولين: <strong className="font-medium text-[#1B1B1B]">{stats.delegatesCount}</strong></span>
          </div>
          <div className="mt-4 space-y-4">
            {delegates.length > 0 ? (
              <div className="mt-2">
                <div className="max-h-64 space-y-3 overflow-y-auto pr-1 sm:max-h-56">
                  {delegates.map((d) => (
                    <div key={d.id} className="rounded-lg border border-[#c9d6e3]/60 bg-[#f8fafc]/50 p-3">
                      <div className="flex flex-col gap-1.5 sm:gap-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="min-w-0 flex-1 font-medium text-[#1e3a5f]">{d.name}</p>
                          {d.serialNumber && (
                            <span className="shrink-0 text-xs text-[#5a6c7d]" dir="ltr">{d.serialNumber}</span>
                          )}
                        </div>
                        <p className="text-xs text-[#5a6c7d]">
                          <span className="font-medium text-[#1B1B1B]">التكليفات:</span>{" "}
                          {d.assignments.length === 0
                            ? "—"
                            : [...new Set(d.assignments.map((a) => (a.subDeptName ? `${a.formationName} / ${a.subDeptName}` : a.formationName)))].join("، ")}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                          <span className="text-xs">قيد التنفيذ: <strong className="text-[#1e3a5f]">{d.pendingCount}</strong></span>
                          <span className="text-xs">منجزة: <strong className="text-[#1E6B3A]">{d.doneCount}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#5a6c7d]">لا يوجد مخولون مسجلون في النظام</p>
            )}
          </div>
        </div>

        {/* التشكيلات — من صفحات الوزارات والدوائر */}
        <div className="rounded-xl border border-[#c9d6e3] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-[#1e3a5f]">التشكيلات</h3>
            <span className="text-sm text-[#5a6c7d]">العدد: <strong className="font-medium text-[#1B1B1B]">{stats.formationsCount}</strong></span>
          </div>
          {formations.length > 0 ? (
            <div className="mt-4 max-h-56 overflow-y-auto pr-1">
              <ul className="space-y-3 text-sm">
                {formations.map((f) => (
                  <li key={f.id} className="rounded-lg border border-[#c9d6e3]/60 bg-[#f8fafc]/50 p-2.5">
                    <p className="font-medium text-[#1e3a5f]">{f.name}</p>
                    {f.subDepts.length > 0 ? (
                      <ul className="mt-1.5 mr-3 space-y-0.5 text-xs text-[#5a6c7d]">
                        {f.subDepts.map((sd) => (
                          <li key={sd.id} className="flex items-center gap-1.5">
                            <span className="h-1 w-1 shrink-0 rounded-full bg-[#1E6B3A]/50" />
                            {sd.name}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#5a6c7d]">لا توجد تشكيلات مسجلة</p>
          )}
        </div>

        {/* الأقسام والموظفون */}
        <div className="rounded-xl border border-[#c9d6e3] bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-[#1e3a5f]">أقسام المكتب والموظفون</h3>
          {sections.length === 0 ? (
            <p className="mt-4 text-sm text-[#5a6c7d]">لا يوجد أقسام مسجلة</p>
          ) : (
            <div className="mt-4 space-y-3 max-h-40 overflow-y-auto">
              {sections.map((sec) => (
                <div key={sec.name}>
                  <p className="text-xs font-medium text-[#5a6c7d]">{sec.name}</p>
                  <ul className="mt-1 space-y-0.5 text-sm text-[#1B1B1B]">
                    {sec.users.map((u) => (
                      <li key={u.id}>• {u.name || u.email}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* قائمة المعاملات */}
      <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm">
        <div className="border-b border-[#c9d6e3] bg-gradient-to-br from-[#1E6B3A]/5 to-transparent px-5 py-4">
          <h3 className="font-semibold text-[#1e3a5f]">المعاملات (آخر ٥٠)</h3>
          <p className="mt-1 text-sm text-[#5a6c7d]">حالة كل معاملة وأين وصلت</p>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-[#5a6c7d]">لا توجد معاملات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right">
              <thead>
                <tr className="border-b border-[#c9d6e3] bg-[#f8fafc] text-sm font-medium text-[#5a6c7d]">
                  <th className="py-3 pr-2">م</th>
                  <th className="py-3 pr-2">المواطن</th>
                  <th className="py-3 pr-2">الرقم</th>
                  <th className="py-3 pr-2">الحالة</th>
                  <th className="py-3 pr-2">مكان المعاملة</th>
                  <th className="py-3 pr-2">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={t.id} className="border-b border-[#c9d6e3]/50">
                    <td className="py-3 pr-2 text-[#5a6c7d]">{i + 1}</td>
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                    <td className="py-3 pr-2 text-[#1B1B1B]" dir="ltr">{t.serialNumber || "—"}</td>
                    <td className="py-3 pr-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.status === "DONE"
                            ? "bg-green-100 text-green-800"
                            : t.status === "OVERDUE"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-sm text-[#1B1B1B]">{getTransactionLocation(t)}</td>
                    <td className="py-3 pr-2 text-sm text-[#5a6c7d]">
                      {new Date(t.createdAt).toLocaleDateString("ar-IQ", { dateStyle: "short", numberingSystem: "arab" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* روابط العودة */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/supervisor/offices"
          className="inline-flex items-center gap-2 rounded-xl border border-[#c9d6e3] bg-white px-4 py-2.5 text-sm font-medium text-[#1e3a5f] shadow-sm transition-all hover:border-[#1E6B3A]/30 hover:bg-[#1E6B3A]/5 hover:text-[#1E6B3A]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          العودة لقائمة المكاتب
        </Link>
        <Link
          href="/supervisor"
          className="inline-flex items-center gap-2 rounded-xl border border-[#c9d6e3] bg-white px-4 py-2.5 text-sm font-medium text-[#1e3a5f] shadow-sm transition-all hover:border-[#1E6B3A]/30 hover:bg-[#1E6B3A]/5 hover:text-[#1E6B3A]"
        >
          لوحة التحكم
        </Link>
      </div>
    </div>
  );
}
