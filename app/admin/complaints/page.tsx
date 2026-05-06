"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

type ComplaintType = "SECRET" | "PUBLIC";

type ComplaintRow = {
  id: string;
  type: ComplaintType;
  name: string;
  address: string | null;
  phone: string;
  details: string;
  attachments: unknown;
  createdAt: string;
};

type ComplaintStats = {
  total: number;
  secretCount: number;
  publicCount: number;
  todayCount: number;
  weekCount: number;
  secretRatio: number;
  publicRatio: number;
};

type ApiResponse = {
  stats: ComplaintStats;
  complaints: ComplaintRow[];
  setupNeeded?: boolean;
  setupMessage?: string;
};

const TYPE_LABEL: Record<ComplaintType, string> = {
  SECRET: "الشكاوى السرية",
  PUBLIC: "الشكاوى العلنية",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "arab",
  }).format(new Date(value));
}

function formatComplaintSerial(id: string, createdAt: string): string {
  const date = new Date(createdAt);
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  const clean = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const tail = clean.slice(-6).padStart(6, "0");
  return `CMP-${year}-${tail}`;
}

function getAttachmentCount(attachments: unknown): number {
  if (!Array.isArray(attachments)) return 0;
  return attachments.filter((item) => typeof item === "string" && item.trim().length > 0).length;
}

function getAttachmentUrls(attachments: unknown): string[] {
  if (!Array.isArray(attachments)) return [];
  return attachments.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function ComplaintTable({
  title,
  rows,
  onView,
}: {
  title: string;
  rows: ComplaintRow[];
  onView: (complaint: ComplaintRow) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
      <div className="border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-3">
        <h2 className="text-base font-semibold text-[#1B1B1B]">{title}</h2>
        <p className="mt-0.5 text-sm text-[#5a5a5a]">عدد السجلات: {rows.length}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-right text-sm">
          <thead>
            <tr className="border-b border-[#d4cfc8] bg-[#faf8f4]">
              <th className="border-l border-[#d4cfc8]/70 px-3 py-3 font-medium text-[#5a5a5a]">#</th>
              <th className="border-l border-[#d4cfc8]/70 px-3 py-3 font-medium text-[#5a5a5a]">اسم المشتكي</th>
              <th className="border-l border-[#d4cfc8]/70 px-3 py-3 font-medium text-[#5a5a5a]">الهاتف</th>
              <th className="border-l border-[#d4cfc8]/70 px-3 py-3 font-medium text-[#5a5a5a]">العنوان</th>
              <th className="border-l border-[#d4cfc8]/70 px-3 py-3 font-medium text-[#5a5a5a]">التفاصيل</th>
              <th className="border-l border-[#d4cfc8]/70 px-3 py-3 font-medium text-[#5a5a5a]">المرفقات</th>
              <th className="border-l border-[#d4cfc8]/70 px-3 py-3 font-medium text-[#5a5a5a]">تاريخ التقديم</th>
              <th className="px-3 py-3 font-medium text-[#5a5a5a]">العمليات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-[#d4cfc8]/70 align-top hover:bg-[#fafafa]">
                <td className="border-l border-[#d4cfc8]/60 px-3 py-3 text-[#5a5a5a]">{index + 1}</td>
                <td className="border-l border-[#d4cfc8]/60 px-3 py-3 font-medium text-[#1B1B1B]">{row.name}</td>
                <td className="border-l border-[#d4cfc8]/60 px-3 py-3 text-[#1B1B1B]" dir="ltr">
                  {row.phone}
                </td>
                <td className="border-l border-[#d4cfc8]/60 px-3 py-3 text-[#5a5a5a]">{row.address || "—"}</td>
                <td className="border-l border-[#d4cfc8]/60 px-3 py-3 text-[#1B1B1B]">
                  <p className="line-clamp-3 max-w-[320px] leading-7">{row.details}</p>
                </td>
                <td className="border-l border-[#d4cfc8]/60 px-3 py-3 text-[#5a5a5a]">{getAttachmentCount(row.attachments)}</td>
                <td className="border-l border-[#d4cfc8]/60 px-3 py-3 text-[#5a5a5a]">{formatDateTime(row.createdAt)}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onView(row)}
                    className="rounded-lg border border-[#1E6B3A]/40 bg-[#1E6B3A]/10 px-3 py-1.5 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                  >
                    عرض
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ComplaintDetailsModal({
  complaint,
  onClose,
}: {
  complaint: ComplaintRow;
  onClose: () => void;
}) {
  const attachmentUrls = getAttachmentUrls(complaint.attachments);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 print:p-0" dir="rtl">
      <button type="button" aria-label="إغلاق" onClick={onClose} className="fixed inset-0 bg-black/50 print:hidden" />
      <div className="relative mx-auto my-8 w-full max-w-4xl rounded-2xl border border-[#d4cfc8] bg-white shadow-xl print:my-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[#d4cfc8] bg-white px-4 py-3 print:hidden sm:px-6">
          <h2 className="text-base font-semibold text-[#1B1B1B]">تفاصيل الشكوى</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-[#1E6B3A]/40 bg-[#1E6B3A]/10 px-3 py-2 text-sm font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
            >
              طباعة / حفظ PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#d4cfc8] px-3 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
            >
              إغلاق
            </button>
          </div>
        </div>

        <div className="complaint-print-sheet mx-auto w-full bg-white px-6 py-8 sm:px-10">
          <div className="mb-6 border-b-2 border-[#1E6B3A] pb-4">
            <h3 className="text-xl font-bold text-[#1B1B1B]">نموذج شكوى رسمي</h3>
            <p className="mt-1 text-sm text-[#5a5a5a]">بوابة الصادقون — متابعة الشكاوى</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#d4cfc8] p-3">
              <p className="text-xs text-[#5a5a5a]">رقم الشكوى</p>
              <p className="mt-1 font-medium text-[#1B1B1B]" dir="ltr">
                {formatComplaintSerial(complaint.id, complaint.createdAt)}
              </p>
            </div>
            <div className="rounded-lg border border-[#d4cfc8] p-3">
              <p className="text-xs text-[#5a5a5a]">نوع الشكوى</p>
              <p className="mt-1 font-medium text-[#1B1B1B]">{TYPE_LABEL[complaint.type]}</p>
            </div>
            <div className="rounded-lg border border-[#d4cfc8] p-3">
              <p className="text-xs text-[#5a5a5a]">اسم المشتكي</p>
              <p className="mt-1 font-medium text-[#1B1B1B]">{complaint.name}</p>
            </div>
            <div className="rounded-lg border border-[#d4cfc8] p-3">
              <p className="text-xs text-[#5a5a5a]">رقم الهاتف</p>
              <p className="mt-1 font-medium text-[#1B1B1B]" dir="ltr">
                {complaint.phone}
              </p>
            </div>
            <div className="rounded-lg border border-[#d4cfc8] p-3 sm:col-span-2">
              <p className="text-xs text-[#5a5a5a]">العنوان</p>
              <p className="mt-1 font-medium text-[#1B1B1B]">{complaint.address || "—"}</p>
            </div>
            <div className="rounded-lg border border-[#d4cfc8] p-3 sm:col-span-2">
              <p className="text-xs text-[#5a5a5a]">تاريخ ووقت التقديم</p>
              <p className="mt-1 font-medium text-[#1B1B1B]">{formatDateTime(complaint.createdAt)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#d4cfc8] p-4">
            <p className="text-xs text-[#5a5a5a]">تفاصيل الشكوى</p>
            <p className="mt-2 whitespace-pre-wrap leading-8 text-[#1B1B1B]">{complaint.details}</p>
          </div>

          <div className="mt-4 rounded-lg border border-[#d4cfc8] p-4">
            <p className="text-xs text-[#5a5a5a]">المرفقات ({attachmentUrls.length})</p>
            {attachmentUrls.length === 0 ? (
              <p className="mt-2 text-sm text-[#5a5a5a]">لا توجد مرفقات</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {attachmentUrls.map((url, idx) => (
                  <li key={`${url}-${idx}`} className="text-sm text-[#1E6B3A]">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
                      مرفق {idx + 1}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminComplaintsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRow | null>(null);

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError("");
      setSetupMessage("");
    }
    try {
      const res = await fetch("/api/admin/complaints", { credentials: "include", cache: "no-store" });
      const payload = (await res.json()) as Partial<ApiResponse> & { error?: string };
      if (!res.ok) {
        if (!opts?.silent) setError(payload.error || "فشل تحميل بيانات الشكاوى.");
        return;
      }
      setData({
        stats: payload.stats as ComplaintStats,
        complaints: (payload.complaints as ComplaintRow[]) || [],
      });
      if (payload.setupNeeded && payload.setupMessage) {
        if (!opts?.silent) setSetupMessage(payload.setupMessage);
      }
    } catch {
      if (!opts?.silent) setError("تعذر الاتصال بالخادم.");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(() => loadData({ silent: true }));

  const secretRows = useMemo(
    () => (data?.complaints || []).filter((item) => item.type === "SECRET"),
    [data?.complaints]
  );
  const publicRows = useMemo(
    () => (data?.complaints || []).filter((item) => item.type === "PUBLIC"),
    [data?.complaints]
  );

  return (
    <div className="space-y-6" dir="rtl">
      <article className="overflow-hidden rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d4cfc8] bg-[#f6f3ed]/50 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-[#1B1B1B]">متابعة الشكاوى</h1>
            <p className="mt-1 text-sm text-[#5a5a5a]">صفحة إدارية لعرض جميع الشكاوى المقدمة من المواطنين مع إحصائيات تفصيلية.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="rounded-lg border border-[#d4cfc8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed] disabled:opacity-60"
          >
            تحديث البيانات
          </button>
        </div>
      </article>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {setupMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{setupMessage}</div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {loading && !data
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-[#d4cfc8] bg-[#f6f3ed]" />
            ))
          : (
              <>
                <div className="rounded-xl border border-[#d4cfc8] bg-white p-4">
                  <p className="text-xs text-[#5a5a5a]">إجمالي الشكاوى</p>
                  <p className="mt-2 text-2xl font-bold text-[#1B1B1B]">{data?.stats.total ?? 0}</p>
                </div>
                <div className="rounded-xl border border-[#d4cfc8] bg-white p-4">
                  <p className="text-xs text-[#5a5a5a]">الشكاوى السرية</p>
                  <p className="mt-2 text-2xl font-bold text-[#1E6B3A]">{data?.stats.secretCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-[#d4cfc8] bg-white p-4">
                  <p className="text-xs text-[#5a5a5a]">الشكاوى العلنية</p>
                  <p className="mt-2 text-2xl font-bold text-[#1e3a5f]">{data?.stats.publicCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-[#d4cfc8] bg-white p-4">
                  <p className="text-xs text-[#5a5a5a]">شكاوى اليوم</p>
                  <p className="mt-2 text-2xl font-bold text-[#b45309]">{data?.stats.todayCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-[#d4cfc8] bg-white p-4">
                  <p className="text-xs text-[#5a5a5a]">آخر 7 أيام</p>
                  <p className="mt-2 text-2xl font-bold text-[#7c3aed]">{data?.stats.weekCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-[#d4cfc8] bg-white p-4">
                  <p className="text-xs text-[#5a5a5a]">النسبة (سرية / علنية)</p>
                  <p className="mt-2 text-lg font-bold text-[#1B1B1B]">
                    {data?.stats.secretRatio ?? 0}% / {data?.stats.publicRatio ?? 0}%
                  </p>
                </div>
              </>
            )}
      </section>

      {!loading && data && (
        <>
          <ComplaintTable title={TYPE_LABEL.SECRET} rows={secretRows} onView={setSelectedComplaint} />
          <ComplaintTable title={TYPE_LABEL.PUBLIC} rows={publicRows} onView={setSelectedComplaint} />
        </>
      )}
      {selectedComplaint && <ComplaintDetailsModal complaint={selectedComplaint} onClose={() => setSelectedComplaint(null)} />}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body * {
            visibility: hidden !important;
          }
          .complaint-print-sheet,
          .complaint-print-sheet * {
            visibility: visible !important;
          }
          .complaint-print-sheet {
            position: absolute;
            inset: 0;
            width: 186mm;
            min-height: 273mm;
            margin: 0 auto;
            background: #fff;
          }
        }
      `}</style>
    </div>
  );
}
