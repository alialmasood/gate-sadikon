"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_EMPLOYEE_SECTOR_OPTIONS } from "@/lib/employee-sector-options";

export type EmployeeSectorOptionItem = { value: string; label: string };

export function useEmployeeSectorOptions() {
  const [options, setOptions] = useState<EmployeeSectorOptionItem[]>(
    DEFAULT_EMPLOYEE_SECTOR_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/form-options/employee-sector", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setOptions(data.map((o: { value: string; label: string }) => ({ value: o.value, label: o.label })));
        }
      }
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { options, loading, reload };
}
