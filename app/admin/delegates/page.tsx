"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

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
};

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
  const headers = ["م", "الرقم التسلسلي", "الوزارة/الهيئة", "الاسم", "الهاتف", "البريد الإلكتروني", "تاريخ التكليف", "الحالة"];
  const rows = list.map((d, i) => [
    String(i + 1),
    escapeCsvCell(d.serialNumber ?? ""),
    escapeCsvCell(d.ministry ?? ""),
    escapeCsvCell(d.name ?? d.email),
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
            <p className="mt-0.5 text-xs text-[#5a5a5a]">جميع المخولين المضافين في النظام — مرتبطون بالنظام وليس بمكتب محدد</p>
          </div>
        </div>
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-[#1B1B1B]">المخولون</h1>
          <p className="mt-0.5 text-sm text-[#5a5a5a]">جميع المخولين المضافين في النظام — مرتبطون بالنظام وليس بمكتب محدد</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
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
            <table className="w-full min-w-[800px] text-right">
              <thead>
                <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                  <th className="py-3 pr-2">م</th>
                  <th className="py-3 pr-2">الرقم التسلسلي</th>
                  <th className="py-3 pr-2">الوزارة/الهيئة</th>
                  <th className="py-3 pr-2">الاسم</th>
                  <th className="py-3 pr-2">الهاتف</th>
                  <th className="py-3 pr-2">البريد الإلكتروني</th>
                  <th className="py-3 pr-2">تاريخ التكليف</th>
                  <th className="py-3 pr-2">الصورة</th>
                  <th className="py-3 pr-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, idx) => (
                  <tr key={d.id} className="border-b border-[#d4cfc8]/80 hover:bg-[#fafafa]">
                    <td className="py-3 pr-2 text-[#5a5a5a]">{idx + 1}</td>
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]" dir="ltr">{d.serialNumber || "—"}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{d.ministry || "—"}</td>
                    <td className="py-3 pr-2 text-[#1B1B1B]">{d.name || d.email}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]" dir="ltr">{d.phone || "—"}</td>
                    <td className="py-3 pr-2 text-[#1B1B1B]" dir="ltr">{d.email}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{formatDateShort(d.assignmentDate)}</td>
                    <td className="py-3 pr-2">
                      {d.avatarUrl ? (
                        <img src={d.avatarUrl} alt="" className="h-10 w-10 rounded-full border border-[#d4cfc8] object-cover" />
                      ) : (
                        <span className="text-[#5a5a5a]">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-2">
                      <span className={d.enabled ? "font-medium text-[#1E6B3A]" : "font-medium text-amber-600"}>{d.enabled ? "مفعّل" : "معطّل"}</span>
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

    </div>
  );
}
