"use client";

import { useEffect } from "react";
import { getDataUpdateChannel } from "@/lib/broadcast-data-update";

const POLL_INTERVAL_MS = 30_000; // 30 ثانية

/**
 * تجديد تلقائي للبيانات: كل 30 ثانية، عند العودة للتبويب، وعند استلام إشعار تحديث من تبويب آخر
 */
export function useAutoRefresh(refetch: () => void | Promise<void>) {
  useEffect(() => {
    const interval = setInterval(() => void refetch(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refetch]);

  useEffect(() => {
    const channel = getDataUpdateChannel();
    if (!channel) return;
    const handler = () => void refetch();
    channel.addEventListener("message", handler);
    return () => channel.removeEventListener("message", handler);
  }, [refetch]);
}
