"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type ParliamentMember = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  enabled: boolean;
  createdAt: string;
};

export default function SupervisorParliamentMembersPage() {
  const [members, setMembers] = useState<ParliamentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadMembers = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const r = await fetch("/api/supervisor/parliament-members");
      if (!r.ok) throw new Error("فشل التحميل");
      const data = await r.json();
      setMembers(data.members ?? []);
      setError("");
    } catch {
      if (!opts?.silent) setError("تعذر تحميل أعضاء مجلس النواب");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useAutoRefresh(() => loadMembers({ silent: true }));

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800">{error}</p>
        </div>
      </div>
    );
  }

  const totalCount = members.length;
  const enabledCount = members.filter((m) => m.enabled).length;
  const disabledCount = members.filter((m) => !m.enabled).length;

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      {/* ترويسة */}
      <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm">
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #1E6B3A, #B08D57)" }}
          aria-hidden
        />
        <div className="px-5 py-6 sm:px-6 sm:py-7">
          <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">أعضاء مجلس النواب</h1>
          <p className="mt-2 text-sm text-[#5a6c7d]">
            قائمة أعضاء مجلس النواب المضافين إلى النظام من لوحة الإدارة العامة
          </p>
        </div>
      </div>

      {/* إحصائيات */}
      <div className="grid min-w-0 grid-cols-3 gap-3 sm:gap-4">
        <div className="flex min-w-0 overflow-hidden rounded-xl border border-[#c9d6e3] bg-white p-3 shadow-sm sm:p-4">
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-right">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1E6B3A]/20 bg-[#1E6B3A]/5 sm:h-10 sm:w-10">
              <svg className="h-4 w-4 text-[#1E6B3A] sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#5a6c7d]">عدد الأعضاء</p>
              <p className="truncate text-lg font-bold text-[#1e3a5f] sm:text-xl">{loading ? "—" : totalCount}</p>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 overflow-hidden rounded-xl border border-[#c9d6e3] bg-white p-3 shadow-sm sm:p-4">
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-right">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1E6B3A]/20 bg-[#1E6B3A]/5 sm:h-10 sm:w-10">
              <svg className="h-4 w-4 text-[#1E6B3A] sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#5a6c7d]">المفعلين</p>
              <p className="truncate text-lg font-bold text-[#1e3a5f] sm:text-xl">{loading ? "—" : enabledCount}</p>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 overflow-hidden rounded-xl border border-[#c9d6e3] bg-white p-3 shadow-sm sm:p-4">
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-center sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-right">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 sm:h-10 sm:w-10">
              <svg className="h-4 w-4 text-amber-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#5a6c7d]">المعطلين</p>
              <p className="truncate text-lg font-bold text-[#1e3a5f] sm:text-xl">{loading ? "—" : disabledCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* قائمة الأعضاء */}
      <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm">
        <div className="border-b border-[#c9d6e3] bg-gradient-to-br from-[#1E6B3A]/5 to-transparent px-4 py-4 sm:px-5">
          <h2 className="font-semibold text-[#1e3a5f]">قائمة أعضاء مجلس النواب</h2>
          <p className="mt-0.5 text-sm text-[#5a6c7d]">الحسابات المضافة من لوحة الإدارة العامة</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-[#5a6c7d]">جاري التحميل…</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-[#5a6c7d]">لا توجد حسابات برلمانية مسجلة</div>
        ) : (
          <>
            {/* عرض بطاقات على الموبايل — بدون شريط تمرير أفقي */}
            <div className="space-y-0 sm:hidden">
              {members.map((m, i) => {
                const isExpanded = expandedIds.has(m.id);
                return (
                  <div
                    key={m.id}
                    className="border-b border-[#c9d6e3]/50 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span
                          className="ml-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-[#e8ecf0] px-2 text-xs font-medium text-[#5a6c7d]"
                          title="التسلسل"
                        >
                          {i + 1}
                        </span>
                        <span className="font-medium text-[#1B1B1B]">{m.name || "—"}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpand(m.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#5a6c7d] transition hover:bg-[#1E6B3A]/10 hover:text-[#1E6B3A]"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "إغلاق التفاصيل" : "فتح التفاصيل"}
                      >
                        <svg
                          className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-[#c9d6e3]/50 bg-[#f8fafc] px-4 py-4">
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <dt className="font-medium text-[#5a6c7d]">التسلسل</dt>
                            <dd className="text-[#1B1B1B]">{i + 1}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="font-medium text-[#5a6c7d]">اسم العضو</dt>
                            <dd className="text-[#1B1B1B]">{m.name || "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="font-medium text-[#5a6c7d]">رقم الهاتف</dt>
                            <dd className="text-[#1B1B1B]" dir="ltr">{m.phone || "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="font-medium text-[#5a6c7d]">الاسم المستخدم</dt>
                            <dd className="truncate text-[#1B1B1B]" dir="ltr">{m.email}</dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="font-medium text-[#5a6c7d]">الحالة</dt>
                            <dd>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  m.enabled ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {m.enabled ? "مفعّل" : "معطّل"}
                              </span>
                            </dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="font-medium text-[#5a6c7d]">تاريخ الإضافة</dt>
                            <dd className="text-[#1B1B1B]">
                              {new Date(m.createdAt).toLocaleDateString("ar-IQ", {
                                dateStyle: "short",
                                numberingSystem: "arab",
                              })}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* جدول على الشاشات الأكبر */}
            <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-[#c9d6e3] bg-[#f8fafc] text-sm font-medium text-[#5a6c7d]">
                  <th className="w-16 py-3 pr-2">التسلسل</th>
                  <th className="py-3 pr-2">اسم عضو مجلس النواب</th>
                  <th className="w-14 py-3 pr-2">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const isExpanded = expandedIds.has(m.id);
                  return (
                    <React.Fragment key={m.id}>
                      <tr key={m.id} className="border-b border-[#c9d6e3]/50">
                        <td className="py-3 pr-2">
                          <span
                            className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-[#e8ecf0] px-2 text-sm font-medium text-[#5a6c7d]"
                            title="التسلسل"
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{m.name || "—"}</td>
                        <td className="py-3 pr-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(m.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5a6c7d] transition hover:bg-[#1E6B3A]/10 hover:text-[#1E6B3A]"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "إغلاق التفاصيل" : "فتح التفاصيل"}
                          >
                            <svg
                              className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${m.id}-detail`}>
                          <td colSpan={3} className="bg-[#f8fafc] p-0">
                            <div className="border-b border-[#c9d6e3]/50 px-4 py-4 sm:px-5">
                              <table className="w-full max-w-md text-right">
                                <tbody className="text-sm">
                                  <tr>
                                    <td className="w-32 py-1.5 pr-4 font-medium text-[#5a6c7d]">التسلسل</td>
                                    <td className="py-1.5 text-[#1B1B1B]">{i + 1}</td>
                                  </tr>
                                  <tr>
                                    <td className="py-1.5 pr-4 font-medium text-[#5a6c7d]">اسم العضو</td>
                                    <td className="py-1.5 text-[#1B1B1B]">{m.name || "—"}</td>
                                  </tr>
                                  <tr>
                                    <td className="py-1.5 pr-4 font-medium text-[#5a6c7d]">رقم الهاتف</td>
                                    <td className="py-1.5 text-[#1B1B1B]" dir="ltr">{m.phone || "—"}</td>
                                  </tr>
                                  <tr>
                                    <td className="py-1.5 pr-4 font-medium text-[#5a6c7d]">الاسم المستخدم</td>
                                    <td className="py-1.5 text-[#1B1B1B]" dir="ltr">{m.email}</td>
                                  </tr>
                                  <tr>
                                    <td className="py-1.5 pr-4 font-medium text-[#5a6c7d]">الحالة</td>
                                    <td className="py-1.5">
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                          m.enabled ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                                        }`}
                                      >
                                        {m.enabled ? "مفعّل" : "معطّل"}
                                      </span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="py-1.5 pr-4 font-medium text-[#5a6c7d]">تاريخ الإضافة</td>
                                    <td className="py-1.5 text-[#1B1B1B]">
                                      {new Date(m.createdAt).toLocaleDateString("ar-IQ", {
                                        dateStyle: "short",
                                        numberingSystem: "arab",
                                      })}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
