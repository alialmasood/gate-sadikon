"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_TRANSACTION_TYPE_OPTIONS } from "@/lib/transaction-type-options";

export type TransactionTypeOptionItem = { value: string; label: string };

export function useTransactionTypeOptions() {
  const [options, setOptions] = useState<TransactionTypeOptionItem[]>(
    DEFAULT_TRANSACTION_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/form-options/transaction-type", { credentials: "include" });
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
