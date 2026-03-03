"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type Formation = {
  id: string;
  name: string;
  type: string;
  subDepts: { id: string; name: string }[];
};

export default function SupervisorFormationsPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFormations = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const r = await fetch("/api/supervisor/formations");
      if (!r.ok) throw new Error("فشل التحميل");
      const data = await r.json();
      setFormations(data.formations ?? []);
      setError("");
    } catch {
      if (!opts?.silent) setError("تعذر تحميل بيانات التشكيلات");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFormations();
  }, [loadFormations]);

  useAutoRefresh(() => loadFormations({ silent: true }));

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
          <h1 className="font-semibold text-[#1e3a5f]">التشكيلات</h1>
          <span className="text-sm text-[#5a6c7d]">
            العدد: <strong className="font-medium text-[#1B1B1B]">{formations.length}</strong>
          </span>
        </div>
        {formations.length > 0 ? (
          <div className="mt-4 space-y-3">
            {formations.map((f) => (
              <div key={f.id} className="rounded-lg border border-[#c9d6e3]/60 bg-[#f8fafc]/50 p-2.5">
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
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#5a6c7d]">لا توجد تشكيلات مسجلة</p>
        )}
      </div>
    </div>
  );
}
