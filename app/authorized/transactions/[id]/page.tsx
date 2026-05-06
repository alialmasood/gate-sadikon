"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { broadcastDataUpdate } from "@/lib/broadcast-data-update";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { markTransactionAsSeen } from "@/lib/authorized-seen";

type DelegateAction = {
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
};

function formatActionDateTime(s: string | undefined): string {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      dateStyle: "medium",
      timeStyle: "short",
      numberingSystem: "arab",
    }).format(new Date(s));
  } catch {
    return s;
  }
}

type Transaction = {
  id: string;
  citizenName: string | null;
  officeName: string | null;
  serialNumber: string | null;
  status: string;
  delegateActions?: DelegateAction[];
};

export default function AuthorizedTransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionText, setActionText] = useState("");
  const [actionFile, setActionFile] = useState<{ url: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadTransaction = useCallback(() => {
    if (!id) return;
    fetch(`/api/authorized/transactions/${id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTransaction(data);
      })
      .catch(() => setError("حدث خطأ غير متوقع"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    loadTransaction();
  }, [id, loadTransaction]);

  useAutoRefresh(loadTransaction);

  useEffect(() => {
    if (id) markTransactionAsSeen(id);
  }, [id]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    const closeMenu = (e: MouseEvent) => {
      const target = e.target as Node;
      if (addMenuRef.current?.contains(target) || addButtonRef.current?.contains(target)) return;
      setAddMenuOpen(false);
    };
    if (addMenuOpen) {
      document.addEventListener("click", closeMenu);
      return () => document.removeEventListener("click", closeMenu);
    }
  }, [addMenuOpen]);

  const openAddMenu = useCallback(() => {
    if (addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.top, left: rect.right });
    }
    setAddMenuOpen(true);
  }, []);

  const handleAddFromDevice = useCallback(() => {
    setAddMenuOpen(false);
    fileInputRef.current?.click();
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("المتصفح لا يدعم الوصول للكاميرا. جرّب تطبيق آخر أو استخدم رفع الصورة من الجهاز.");
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOpen(true);
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err);
      const name = err instanceof Error ? err.name : "";
      if (name === "SecurityError" || msg.includes("secure") || msg.includes("HTTPS")) {
        alert("الكاميرا تتطلب اتصال آمن (HTTPS). جرّب على شبكة آمنة أو استخدم رفع الصورة من الجهاز.");
      } else if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        alert("تم رفض إذن الكاميرا. يُرجى السماح بالوصول للكاميرا من إعدادات المتصفح.");
      } else if (msg.includes("NotFound")) {
        alert("لم يتم العثور على كاميرا. استخدم خيار رفع الصورة من الجهاز.");
      } else {
        alert("تعذّر فتح الكاميرا. يُفضّل استخدام خيار إضافة ملفات من الجهاز.");
      }
    }
  }, []);

  const handleCameraFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const url = await uploadFile(file);
      if (url) setActionFile({ url, name: file.name });
    },
    []
  );

  const handleOpenCamera = useCallback(() => {
    setAddMenuOpen(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraFileInputRef.current?.click();
      return;
    }
    startCamera();
  }, [startCamera]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);

  const captureFromCamera = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        uploadFile(file).then((url) => {
          if (url) setActionFile({ url, name: file.name });
          stopCamera();
        });
      },
      "image/jpeg",
      0.9
    );
  }, [stopCamera]);

  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    return res.ok && data.url ? data.url : null;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) setActionFile({ url, name: file.name });
    e.target.value = "";
  };

  const handleSaveAction = async () => {
    const text = actionText.trim();
    if (!text) {
      alert("يرجى إدخال نص الإجراء");
      return;
    }
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/authorized/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          addAction: {
            text,
            attachmentUrl: actionFile?.url,
            attachmentName: actionFile?.name,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.delegateActions) {
        broadcastDataUpdate();
        setActionText("");
        setActionFile(null);
        setTransaction((prev) => (prev ? { ...prev, delegateActions: data.delegateActions } : prev));
      } else if (res.ok) {
        broadcastDataUpdate();
        setActionText("");
        setActionFile(null);
        loadTransaction();
      } else {
        alert(data.error || "فشل حفظ الإجراء");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/authorized/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ complete: true }),
      });
      const data = await res.json();
      if (res.ok) {
        broadcastDataUpdate();
        setTransaction((prev) => (prev ? { ...prev, status: "DONE" } : prev));
        router.push("/authorized/transactions");
      } else {
        alert(data.error || "فشل إكمال المعاملة");
      }
    } finally {
      setCompleting(false);
    }
  };

  if (!id) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4" dir="rtl">
        <p className="text-[#5a5a5a]">معرّف المعاملة غير صالح</p>
        <Link href="/authorized/transactions" className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1E6B3A] px-6 py-3 text-sm font-medium text-white">
          العودة للمعاملات
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4" dir="rtl">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#1E6B3A] border-t-transparent" />
        <p className="text-sm text-[#5a5a5a]">جاري تحميل المعاملة...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="rounded-xl border border-amber-200 bg-[rgba(254,243,199,0.8)] p-6 text-center">
          <p className="text-amber-800">{error || "لم يتم العثور على المعاملة"}</p>
          <Link href="/authorized/transactions" className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1E6B3A] px-6 py-3 text-sm font-medium text-white">
            العودة للمعاملات
          </Link>
        </div>
      </div>
    );
  }

  const isDone = transaction.status === "DONE";
  const actions = transaction.delegateActions ?? [];

  return (
    <div className="min-h-0 space-y-6 pb-[env(safe-area-inset-bottom)]" dir="rtl">
      <header className="flex items-center gap-3 rounded-xl border border-[rgba(44,62,80,0.1)] bg-white px-3 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:px-4">
        <Link
          href="/authorized/transactions"
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-[#5a5a5a] hover:bg-[rgba(44,62,80,0.1)] active:scale-95"
          aria-label="العودة"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-[#1a1a2e]">البدء بالإجراءات</h1>
          <p className="font-mono text-sm text-[#1E6B3A]" dir="ltr">
            {transaction.serialNumber ? `2026-${transaction.serialNumber}` : "—"}
          </p>
        </div>
      </header>

      <div className="space-y-4">
        <div className="rounded-xl border border-[rgba(44,62,80,0.1)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-[#5a5a5a]">رقم المعاملة</p>
              <p className="font-mono font-semibold text-[#1a1a2e]" dir="ltr">
                {transaction.serialNumber ? `2026-${transaction.serialNumber}` : "—"}
              </p>
            </div>
            <div className="border-t border-[rgba(44,62,80,0.1)]" />
            <div>
              <p className="text-xs font-medium text-[#5a5a5a]">اسم صاحب المعاملة</p>
              <p className="font-semibold text-[#1a1a2e]">{transaction.citizenName || "—"}</p>
            </div>
            <div className="border-t border-[rgba(44,62,80,0.1)]" />
            <div>
              <p className="text-xs font-medium text-[#5a5a5a]">اسم المكتب</p>
              <p className="font-semibold text-[#1a1a2e]">{transaction.officeName || "—"}</p>
            </div>
          </div>
        </div>

        {!isDone && (
          <div className="rounded-xl border border-[rgba(44,62,80,0.1)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="mb-3 text-base font-bold text-[#1a1a2e]">تسجيل إجراء</h2>
            <div className="flex gap-2">
              <textarea
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="اكتب تفاصيل الإجراء..."
                rows={3}
                className="min-w-0 flex-1 rounded-xl border border-[rgba(44,62,80,0.2)] bg-[#f8fafc] px-4 py-3 text-sm text-[#1a1a2e] placeholder-[rgba(90,90,90,0.6)] focus:border-[#1E6B3A] focus:outline-none focus:ring-2 focus:ring-[rgba(30,107,58,0.2)]"
              />
              <div className="relative flex shrink-0 flex-col" ref={addMenuRef}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  ref={cameraFileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleCameraFileSelected}
                />
                <button
                  ref={addButtonRef}
                  type="button"
                  onClick={() => (addMenuOpen ? setAddMenuOpen(false) : openAddMenu())}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[rgba(44,62,80,0.2)] bg-[#f8fafc] text-2xl font-light text-[#1E6B3A] transition-colors hover:bg-[rgba(30,107,58,0.1)] active:scale-95"
                  aria-label="إضافة مرفق"
                >
                  +
                </button>
                {addMenuOpen &&
                  typeof document !== "undefined" &&
                  createPortal(
                    <div
                      ref={addMenuRef}
                      className="fixed z-[99999] flex min-w-[200px] -translate-y-full flex-col gap-0.5 rounded-xl border border-[rgba(44,62,80,0.15)] bg-white py-1 shadow-xl"
                      style={{ top: menuPosition.top - 8, left: menuPosition.left }}
                    >
                      <button
                        type="button"
                        onClick={handleAddFromDevice}
                        className="flex items-center gap-2 px-4 py-2.5 text-right text-sm text-[#1a1a2e] hover:bg-[#f8fafc] active:bg-[#f1f5f9]"
                      >
                        <svg className="h-5 w-5 shrink-0 text-[#0D9488]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        إضافة ملفات من الجهاز
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenCamera}
                        className="flex items-center gap-2 px-4 py-2.5 text-right text-sm text-[#1a1a2e] hover:bg-[#f8fafc] active:bg-[#f1f5f9]"
                      >
                        <svg className="h-5 w-5 shrink-0 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7" />
                        </svg>
                        فتح الكاميرا
                      </button>
                    </div>,
                    document.body
                  )}
              </div>
            </div>
            {cameraOpen && (
              <>
                <div className="relative mt-3 overflow-hidden rounded-xl border border-[rgba(44,62,80,0.1)] bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="h-48 w-full object-cover" />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={captureFromCamera}
                    className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E6B3A] px-4 py-2 text-sm font-medium text-white active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                    التقاط صورة
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}
            {actionFile && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[rgba(44,62,80,0.1)] bg-[#f8fafc] px-3 py-2">
                <span className="truncate text-sm">{actionFile.name}</span>
                <button type="button" onClick={() => setActionFile(null)} className="text-red-600">
                  حذف
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleSaveAction}
              disabled={saving}
              className="mt-4 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1E6B3A] px-4 py-3 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "حفظ الإجراء"
              )}
            </button>
          </div>
        )}

        {actions.length > 0 && (
          <div className="rounded-xl border border-[rgba(44,62,80,0.1)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="mb-3 text-base font-bold text-[#1a1a2e]">الإجراءات المسجلة</h2>
            <ul className="space-y-3">
              {actions.map((a, i) => (
                <li key={i} className="rounded-lg border border-[rgba(44,62,80,0.1)] bg-[#f8fafc] p-3">
                  <p className="text-xs font-medium text-[#5a5a5a]">{formatActionDateTime(a.createdAt)}</p>
                  <p className="mt-1 text-sm text-[#1a1a2e]">{a.text}</p>
                  {a.attachmentUrl && (
                    <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[#0D9488]">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {a.attachmentName || "مرفق"}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isDone && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-[#1E6B3A] bg-[#1E6B3A] px-4 py-3 text-base font-bold text-white active:scale-[0.98] disabled:opacity-60"
          >
            {completing ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "إكمال المعاملة"
            )}
          </button>
        )}

        {isDone && (
          <div className="rounded-xl border border-[#ccfbf1] bg-[rgba(204,251,241,0.3)] p-4 text-center">
            <p className="font-semibold text-[#0f766e]">تم إكمال المعاملة</p>
          </div>
        )}
      </div>
    </div>
  );
}
