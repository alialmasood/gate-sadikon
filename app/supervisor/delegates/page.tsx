"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type Delegate = {
  id: string;
  name: string;
  serialNumber: string | null;
  email: string | null;
  ministry: string | null;
  department: string | null;
  assignments: { formationName: string; subDeptName: string | null }[];
  pendingCount: number;
  doneCount: number;
};

export default function SupervisorDelegatesPage() {
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDelegates = useCallback(async (opts?: { silent?: boolean; bypassCache?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const url = opts?.bypassCache
        ? `/api/supervisor/delegates?t=${Date.now()}`
        : "/api/supervisor/delegates";
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error("فشل التحميل");
      const data = await r.json();
      setDelegates(data.delegates ?? []);
      setError("");
    } catch {
      if (!opts?.silent) setError("تعذر تحميل بيانات المخولين");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDelegates();
  }, [loadDelegates]);

  useAutoRefresh(() => loadDelegates({ silent: true, bypassCache: true }));

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="animate-pulse rounded-xl border border-[#c9d6e3] bg-white p-8">
          <div className="h-6 w-1/3 rounded bg-[#e8ecf0]" />
          <div className="mt-4 h-4 w-1/2 rounded bg-[#e8ecf0]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-amber-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      <div className="rounded-xl border border-[#c9d6e3] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-semibold text-[#1e3a5f]">المخولون</h1>
          <span className="text-sm text-[#5a6c7d]">
            عدد المخولين: <strong className="font-medium text-[#1B1B1B]">{delegates.length}</strong>
          </span>
        </div>
        {delegates.length > 0 ? (
          <div className="mt-4 space-y-3">
            {delegates.map((d) => (
              <div key={d.id} className="rounded-lg border border-[#c9d6e3]/60 bg-[#f8fafc]/50 p-3">
                <div className="flex flex-col gap-1.5 sm:gap-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="min-w-0 flex-1 font-medium text-[#1e3a5f]">{d.name}</p>
                    {d.serialNumber && (
                      <span className="shrink-0 text-xs text-[#5a6c7d]" dir="ltr">
                        {d.serialNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5a6c7d]">
                    <span className="font-medium text-[#1B1B1B]">التكليفات:</span>{" "}
                    {d.assignments.length === 0
                      ? "—"
                      : [...new Set(d.assignments.map((a) => (a.subDeptName ? `${a.formationName} / ${a.subDeptName}` : a.formationName)))].join("، ")}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                    <span className="text-xs">
                      قيد التنفيذ: <strong className="text-[#1e3a5f]">{d.pendingCount}</strong>
                    </span>
                    <span className="text-xs">
                      منجزة: <strong className="text-[#1E6B3A]">{d.doneCount}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#5a6c7d]">لا يوجد مخولون مسجلون في النظام</p>
        )}
      </div>
    </div>
  );
}
