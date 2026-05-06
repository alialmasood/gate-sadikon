"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type StaffMember = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  roleLabel: string;
  enabled: boolean;
  createdAt: string;
};

function formatDate(s: string): string {
  try {
    return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short", numberingSystem: "arab" }).format(new Date(s));
  } catch {
    return s;
  }
}

function formatDateShort(s: string): string {
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

function downloadStaffExcel(list: StaffMember[]) {
  const headers = ["الاسم", "البريد الإلكتروني", "وظيفة الحساب", "الحالة", "تاريخ إنشاء الحساب"];
  const rows = list.map((u) => [
    escapeCsvCell(u.name ?? ""),
    escapeCsvCell(u.email),
    escapeCsvCell(u.roleLabel),
    escapeCsvCell(u.enabled ? "مفعّل" : "معطّل"),
    escapeCsvCell(formatDateShort(u.createdAt)),
  ]);
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `موظفين-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/staff");
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      } else {
        setStaff([]);
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(() => loadData({ silent: true }));

  const stats = useMemo(() => {
    const enabled = staff.filter((u) => u.enabled).length;
    const disabled = staff.filter((u) => !u.enabled).length;
    const admins = staff.filter((u) => u.role === "ADMIN").length;
    return { total: staff.length, enabled, disabled, admins };
  }, [staff]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* موبايل فقط: تنسيق رسمي للعنوان + أزرار في بطاقة */}
        <div className="w-full space-y-3 md:hidden">
          <div className="rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-[#f6f3ed]/60 px-4 py-3 shadow-sm">
            <h1 className="text-lg font-bold text-[#1B1B1B]">الموظفين</h1>
            <p className="mt-0.5 text-xs text-[#5a5a5a]">جميع الحسابات والموظفين التابعين للمكتب</p>
          </div>
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={() => loadData()}
              disabled={loading}
              className="min-w-0 flex-1 rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] shadow-sm hover:bg-[#f6f3ed] disabled:opacity-50"
            >
              تحديث
            </button>
            <button
              type="button"
              onClick={() => downloadStaffExcel(staff)}
              disabled={loading || staff.length === 0}
              className="min-w-0 flex-1 rounded-xl border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-4 py-2.5 text-sm font-medium text-[#1E6B3A] shadow-sm hover:bg-[#1E6B3A]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              تصدير Excel
            </button>
          </div>
        </div>
        {/* اللابتوب: العنوان والأزرار كما هي */}
        <h1 className="hidden text-2xl font-bold text-[#1B1B1B] md:block">الموظفين</h1>
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="rounded-xl border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed] disabled:opacity-50"
          >
            تحديث
          </button>
          <button
            type="button"
            onClick={() => downloadStaffExcel(staff)}
            disabled={loading || staff.length === 0}
            className="rounded-xl border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-4 py-2.5 text-sm font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            تصدير Excel
          </button>
        </div>
      </div>
      <p className="hidden text-[#5a5a5a] md:block">جميع الحسابات والموظفين التابعين للمكتب</p>

      {/* موبايل فقط: رأس رسمي للإحصائيات */}
      <div className="rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-[#f6f3ed]/60 px-4 py-3 shadow-sm md:hidden">
        <h2 className="text-base font-semibold text-[#1B1B1B]">إحصائيات الموظفين</h2>
        <p className="mt-0.5 text-xs text-[#5a5a5a]">ملخص الحسابات التابعة للمكتب</p>
      </div>

      {/* بطاقات إحصائية — موبايل: سطرين (2×2). ديسكتوب: دون تغيير */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#5B7C99] bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-[#5a5a5a]">إجمالي الحسابات</p>
          <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{loading ? "—" : stats.total}</p>
        </div>
        <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-[#5a5a5a]">مفعّل</p>
          <p className="mt-2 text-2xl font-bold text-[#1E6B3A]">{loading ? "—" : stats.enabled}</p>
        </div>
        <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#5a5a5a] bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-[#5a5a5a]">معطّل</p>
          <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{loading ? "—" : stats.disabled}</p>
        </div>
        <div className="flex flex-col rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#B08D57] bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-[#5a5a5a]">مدير المكتب</p>
          <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{loading ? "—" : stats.admins}</p>
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        {/* رأس القسم — موبايل: تنسيق رسمي. ديسكتوب: الأصلي */}
        <div className="px-4 py-3 md:border-b md:border-[#d4cfc8] md:bg-[#f6f3ed]/50 md:px-6">
          <div className="rounded-xl border border-[#d4cfc8] border-r-4 border-r-[#1E6B3A] bg-[#f6f3ed]/70 px-4 py-3 shadow-sm md:hidden">
            <h2 className="text-base font-semibold text-[#1B1B1B]">قائمة الحسابات</h2>
            <p className="mt-0.5 text-xs text-[#5a5a5a]">الحسابات المرتبطة بالمكتب حسب الدور</p>
          </div>
          <div className="hidden md:block">
            <h2 className="text-base font-semibold text-[#1B1B1B]">قائمة الحسابات</h2>
            <p className="mt-0.5 text-sm text-[#5a5a5a]">الحسابات المرتبطة بالمكتب حسب الدور</p>
          </div>
        </div>
        {loading ? (
          <p className="py-12 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : staff.length === 0 ? (
          <p className="py-12 text-center text-[#5a5a5a]">لا توجد حسابات مرتبطة بالمكتب.</p>
        ) : (
          <>
            {/* موبايل فقط: قائمة قابلة للتوسيع */}
            <div className="space-y-0 divide-y divide-[#d4cfc8]/40 p-4 md:hidden" dir="rtl">
              {staff.map((u, idx) => {
                const isExpanded = expandedRowId === u.id;
                const isEven = idx % 2 === 0;
                return (
                  <div
                    key={u.id}
                    className={`border-b border-[#d4cfc8]/30 ${isEven ? "bg-[#f6f3ed]/30" : "bg-white"} last:border-b-0`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedRowId(isExpanded ? null : u.id)}
                      className="flex w-full items-center justify-between gap-2 py-3 px-1 text-right"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="w-6 shrink-0 text-center text-sm font-medium text-[#5a5a5a]">{(idx + 1).toLocaleString("ar-EG")}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-[#1B1B1B]">{u.name || u.email || "—"}</span>
                        <span className="shrink-0 rounded-full bg-[#1E6B3A]/10 px-2 py-0.5 text-xs font-medium text-[#1E6B3A]">{u.roleLabel}</span>
                      </div>
                      <span className={`shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden>
                        <svg className="h-5 w-5 text-[#5a5a5a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-[#d4cfc8]/50 bg-[#FAFAF9] w-full px-4 py-3">
                        <dl className="text-sm">
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3 first:pt-0">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">الاسم</dt>
                            <dd className="min-w-0 flex-1 truncate text-left text-[#1B1B1B]">{u.name || "—"}</dd>
                          </div>
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">البريد الإلكتروني</dt>
                            <dd className="min-w-0 flex-1 truncate text-left text-[#1B1B1B] dir-ltr">{u.email}</dd>
                          </div>
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">وظيفة الحساب</dt>
                            <dd className="min-w-0 flex-1 text-left">
                              <span className="rounded-full bg-[#1E6B3A]/10 px-2 py-0.5 text-xs font-medium text-[#1E6B3A]">{u.roleLabel}</span>
                            </dd>
                          </div>
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">الحالة</dt>
                            <dd className="min-w-0 flex-1 text-left text-[#1B1B1B]">{u.enabled ? "مفعّل" : "معطّل"}</dd>
                          </div>
                          <div className="flex w-full justify-between gap-4 border-b border-[#d4cfc8]/50 py-3">
                            <dt className="shrink-0 font-medium text-[#5a5a5a]">تاريخ إنشاء الحساب</dt>
                            <dd className="min-w-0 flex-1 text-left text-[#1B1B1B]">{formatDate(u.createdAt)}</dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* ديسكتوب: الجدول الأصلي */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[500px] text-right text-sm">
                <thead>
                  <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50">
                    <th className="py-3 px-4 font-medium text-[#5a5a5a]">الاسم</th>
                    <th className="py-3 px-4 font-medium text-[#5a5a5a]">البريد الإلكتروني</th>
                    <th className="py-3 px-4 font-medium text-[#5a5a5a]">الدور</th>
                    <th className="py-3 px-4 font-medium text-[#5a5a5a]">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((u) => (
                    <tr key={u.id} className="border-b border-[#d4cfc8]/80 hover:bg-[#f6f3ed]/30">
                      <td className="py-3 px-4 font-medium text-[#1B1B1B]">{u.name || "—"}</td>
                      <td className="py-3 px-4 text-[#5a5a5a]">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-[#1E6B3A]/10 px-2 py-0.5 text-xs font-medium text-[#1E6B3A]">
                          {u.roleLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.enabled ? (
                          <span className="text-[#1E6B3A]">مفعّل</span>
                        ) : (
                          <span className="text-[#5a5a5a]">معطّل</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
