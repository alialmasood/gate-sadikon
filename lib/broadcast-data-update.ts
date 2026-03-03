const CHANNEL_NAME = "gate-sadikon-data-update";

/**
 * إبلاغ التبويبات الأخرى بتحديث البيانات (لإعادة تحميل صفحات المشرف تلقائياً)
 */
export function broadcastDataUpdate() {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    new BroadcastChannel(CHANNEL_NAME).postMessage({ type: "data-updated" });
  } catch {
    // تجاهل إن لم يُدعم
  }
}

export function getDataUpdateChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}
