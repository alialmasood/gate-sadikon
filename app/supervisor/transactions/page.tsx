"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type AttachmentItem = { url: string; name?: string };

function getAttachmentsList(attachments: unknown): AttachmentItem[] {
  if (!attachments || !Array.isArray(attachments)) return [];
  return attachments.filter(
    (a: unknown): a is AttachmentItem => a !== null && typeof a === "object" && typeof (a as { url?: string }).url === "string"
  );
}

function canPreviewAttachment(url: string, name?: string): { isImage: boolean; isPdf: boolean } {
  const nameOrPath = name || url.split("?")[0];
  const ext = nameOrPath.toLowerCase().split(".").pop() || "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext);
  const isPdf = ext === "pdf";
  return { isImage, isPdf };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد التنفيذ",
  DONE: "منجزة",
  OVERDUE: "متأخرة",
};

const SECTION_LABELS: Record<string, string> = {
  SORTING: "قسم الفرز",
  ADMIN: "مدير المكتب",
  COORDINATOR: "المتابعة",
  RECEPTION: "الاستقبال",
  DOCUMENTATION: "التوثيق",
};

const SOURCE_LABELS: Record<string, string> = {
  RECEPTION: "الاستقبال",
  COORDINATOR: "التنسيق والمتابعة",
  DOCUMENTATION: "التوثيق",
  ADMIN: "مدير المكتب",
};

type Transaction = {
  id: string;
  officeId: string;
  officeName: string;
  citizenName: string | null;
  citizenPhone: string | null;
  serialNumber: string | null;
  status: string;
  formationName: string | null;
  subDeptName: string | null;
  delegateName: string | null;
  reachedSorting: boolean;
  completedAt: string | null;
  createdAt: string;
  assignedFromSection: string | null;
  sourceSection: string | null;
  transactionTitle: string | null;
  transactionType: string | null;
  urgent: boolean;
  completedByAdmin: boolean;
  cannotComplete: boolean;
  cannotCompleteReason: string | null;
  attachments?: unknown;
};

/** مسيرة المعاملة — حالة المعاملة الكاملة */
function getTransactionJourney(t: Transaction): string[] {
  const steps: string[] = [];
  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("ar-IQ", { dateStyle: "short", numberingSystem: "arab" }) : null;

  steps.push(`إنشاء: ${fmtDate(t.createdAt) ?? "—"}`);

  if (t.sourceSection) {
    steps.push(`القسم المصدر: ${SOURCE_LABELS[t.sourceSection] ?? t.sourceSection}`);
  }

  if (t.reachedSorting) {
    steps.push("وصل قسم الفرز");
  }

  if (t.assignedFromSection) {
    steps.push(`تعيين من: ${SECTION_LABELS[t.assignedFromSection] ?? t.assignedFromSection}`);
  }

  if (t.delegateName) {
    steps.push(`لدى المخول: ${t.delegateName}`);
  }

  if (t.status === "DONE") {
    const done = t.completedAt ? `إنجاز: ${fmtDate(t.completedAt)}` : "منجزة";
    steps.push(t.completedByAdmin ? `${done} (من المدير)` : done);
  } else if (t.status === "OVERDUE") {
    steps.push("متأخرة");
  } else {
    steps.push("قيد التنفيذ");
  }

  if (t.cannotComplete && t.cannotCompleteReason) {
    steps.push(`سبب عدم الإكمال: ${t.cannotCompleteReason}`);
  }

  return steps;
}

function getTransactionLocation(t: {
  status: string;
  reachedSorting: boolean;
  delegateName: string | null;
  assignedFromSection: string | null;
}): string {
  if (t.status === "DONE") return "منجزة";
  if (t.delegateName) return `لدى المخول: ${t.delegateName}`;
  if (t.reachedSorting) return "قسم الفرز — بانتظار التعيين";
  const sec = t.assignedFromSection ? SECTION_LABELS[t.assignedFromSection] || t.assignedFromSection : "—";
  return sec;
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("ar-IQ", { dateStyle: "short", numberingSystem: "arab" }) : "—";

function fmtSerialNumber(sn: string | null): string {
  if (!sn || !sn.trim()) return "—";
  return sn.includes("-") ? sn : `2026-${sn}`;
}

/** بناء نص تفاصيل المعاملة للإرسال عبر واتساب */
function buildTransactionWhatsAppText(
  t: Transaction,
  i: number,
  attachments: AttachmentItem[]
): string {
  const lines: string[] = [];
  lines.push("━━━ *تفاصيل المعاملة* ━━━");
  lines.push("");
  lines.push(`*التسلسل:* ${i + 1}`);
  lines.push(`*اسم المواطن:* ${t.citizenName || "—"}`);
  lines.push(`*رقم الهاتف:* ${t.citizenPhone || "—"}`);
  lines.push(`*الرقم التسلسلي:* ${fmtSerialNumber(t.serialNumber)}`);
  lines.push(`*المكتب:* ${t.officeName}`);
  lines.push(`*التشكيل:* ${t.formationName || "—"}`);
  lines.push(`*التقسيم الفرعي:* ${t.subDeptName || "—"}`);
  lines.push(`*الحالة:* ${STATUS_LABELS[t.status] || t.status}`);
  lines.push(`*مكان المعاملة:* ${getTransactionLocation(t)}`);
  lines.push(`*تاريخ الإنشاء:* ${fmtDate(t.createdAt)}`);
  lines.push(`*تاريخ الإنجاز:* ${fmtDate(t.completedAt)}`);
  if (t.transactionTitle) lines.push(`*عنوان المعاملة:* ${t.transactionTitle}`);
  if (t.transactionType) lines.push(`*نوع المعاملة:* ${t.transactionType}`);
  if (t.urgent) lines.push("*عاجلة:* نعم");
  lines.push("");
  lines.push("━━━ *مسيرة المعاملة* ━━━");
  getTransactionJourney(t).forEach((step) => lines.push(`• ${step}`));
  if (attachments.length > 0) {
    lines.push("");
    lines.push("━━━ *المرفقات* ━━━");
    attachments.forEach((a, idx) => {
      lines.push(`• ${a.name || `مرفق ${idx + 1}`}: ${a.url}`);
    });
  }
  lines.push("");
  lines.push("──── من بوابة الصادقون - قسم الإشراف والمراقبة ────");
  return lines.join("\n");
}

function TransactionDetailContent({
  t,
  i,
  attachments,
}: {
  t: Transaction;
  i: number;
  attachments: AttachmentItem[];
}) {
  const detailRows: { label: string; value?: string | null; link?: string; status?: string; ltr: boolean }[] = [
    { label: "التسلسل", value: String(i + 1), ltr: true },
    { label: "اسم المواطن", value: t.citizenName || "—", ltr: false },
    { label: "رقم الهاتف", value: t.citizenPhone || "—", ltr: true },
    { label: "الرقم التسلسلي", value: fmtSerialNumber(t.serialNumber), ltr: true },
    { label: "المكتب", value: t.officeName, link: `/supervisor/offices/${t.officeId}`, ltr: false },
    { label: "التشكيل", value: t.formationName || "—", ltr: false },
    { label: "التقسيم الفرعي", value: t.subDeptName || "—", ltr: false },
    { label: "الحالة", status: t.status, ltr: false },
    { label: "مكان المعاملة", value: getTransactionLocation(t), ltr: false },
    { label: "تاريخ الإنشاء", value: fmtDate(t.createdAt), ltr: false },
    { label: "تاريخ الإنجاز", value: fmtDate(t.completedAt), ltr: false },
  ];
  if (t.transactionTitle) detailRows.push({ label: "عنوان المعاملة", value: t.transactionTitle, ltr: false });
  if (t.transactionType) detailRows.push({ label: "نوع المعاملة", value: t.transactionType, ltr: false });
  if (t.urgent) detailRows.push({ label: "عاجلة", value: "نعم", ltr: false });

  return (
    <div className="border-t border-[#c9d6e3]/50 px-4 py-4" dir="rtl">
      <dl className="space-y-0 text-sm">
        {detailRows.map((row, idx) => (
          <div
            key={row.label}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 ${
              idx % 2 === 0 ? "bg-[#f0f4f8]/60" : "bg-white/80"
            }`}
          >
            <dt className="w-32 shrink-0 font-medium text-[#5a6c7d]">{row.label}</dt>
            <dd
              className={`min-w-0 flex-1 text-[#1B1B1B] ${row.ltr ? "text-left" : "text-right"}`}
              dir={row.ltr ? "ltr" : "rtl"}
            >
              {row.status ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    row.status === "DONE" ? "bg-green-100 text-green-800" : row.status === "OVERDUE" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {STATUS_LABELS[row.status] || row.status}
                </span>
              ) : row.link ? (
                <Link href={row.link} className="text-[#1E6B3A] hover:underline">
                  {row.value}
                </Link>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {/* مسيرة المعاملة */}
      <div className="mt-4 border-t border-[#c9d6e3]/50 pt-4">
        <p className="mb-2 font-medium text-[#5a6c7d]">مسيرة المعاملة</p>
        <ul className="space-y-0">
          {getTransactionJourney(t).map((step, j) => (
            <li
              key={j}
              className={`flex items-start gap-1.5 px-3 py-2 text-xs text-[#1B1B1B] ${j % 2 === 0 ? "bg-[#f0f4f8]/60" : "bg-white/80"}`}
              dir="rtl"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#1E6B3A]/50" />
              <span className="flex-1 text-right">{step}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* المرفقات مع معاينة */}
      {attachments.length > 0 && (
        <div className="mt-4 border-t border-[#c9d6e3]/50 pt-4">
          <p className="mb-3 font-medium text-[#5a6c7d]">المرفقات</p>
          <ul className="space-y-3">
            {attachments.map((att, idx) => {
              const { isImage, isPdf } = canPreviewAttachment(att.url, att.name);
              const canPreview = isImage || isPdf;
              return (
                <li key={idx} className="rounded-lg border border-[#c9d6e3]/60 bg-white p-3">
                  <p className="truncate text-sm font-medium text-[#1B1B1B]" title={att.name || att.url}>
                    {att.name || `مرفق ${idx + 1}`}
                  </p>
                  {canPreview && (
                    <div className="mt-2 max-h-40 overflow-hidden rounded border border-[#c9d6e3]/40 bg-[#f8fafc]">
                      {isImage ? (
                        <img
                          src={att.url}
                          alt={att.name || `مرفق ${idx + 1}`}
                          className="h-auto max-h-40 w-full object-contain"
                        />
                      ) : (
                        <iframe
                          src={att.url}
                          title={att.name || `مرفق ${idx + 1}`}
                          className="h-40 w-full"
                        />
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#1E6B3A]/50 bg-[#1E6B3A]/10 px-3 py-1.5 text-xs font-medium text-[#1E6B3A] hover:bg-[#1E6B3A]/20"
                    >
                      عرض في تبويب جديد
                    </a>
                    <a
                      href={att.url}
                      download={att.name || `attachment-${idx + 1}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#5a6c7d]/50 bg-[#5a6c7d]/10 px-3 py-1.5 text-xs font-medium text-[#5a6c7d] hover:bg-[#5a6c7d]/20"
                    >
                      تحميل
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {/* زر إرسال واتساب */}
      <div className="mt-4 border-t border-[#c9d6e3]/50 pt-4">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(buildTransactionWhatsAppText(t, i, attachments))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-[#25D366]/50 bg-[#25D366]/10 px-4 py-2.5 text-sm font-medium text-[#128C7E] transition hover:bg-[#25D366]/20 hover:border-[#25D366]/70"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          إرسال تفاصيل المعاملة عبر واتساب
        </a>
      </div>
    </div>
  );
}

function SupervisorTransactionsContent() {
  const searchParams = useSearchParams();
  const officeIdFromUrl = searchParams.get("officeId") ?? "";
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchTransactions = useCallback(
    (overrides?: { q?: string; dateFrom?: string; dateTo?: string; officeId?: string; silent?: boolean }) => {
      if (!overrides?.silent) setLoading(true);
      const params = new URLSearchParams();
      const q = overrides?.q ?? search;
      const from = overrides?.dateFrom ?? dateFrom;
      const to = overrides?.dateTo ?? dateTo;
      const oid = overrides?.officeId ?? officeIdFromUrl;
      if (q) params.set("q", q);
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      if (oid) params.set("officeId", oid);
      fetch(`/api/supervisor/transactions?${params.toString()}`)
        .then((r) => {
          if (!r.ok) throw new Error("فشل التحميل");
          return r.json();
        })
        .then((data) => setTransactions(data.transactions ?? []))
        .catch(() => {
          if (!overrides?.silent) setError("تعذر تحميل المعاملات");
        })
        .finally(() => {
          if (!overrides?.silent) setLoading(false);
        });
    },
    [search, dateFrom, dateTo, officeIdFromUrl]
  );

  useEffect(() => {
    fetchTransactions();
  }, [officeIdFromUrl]);

  useAutoRefresh(() => fetchTransactions({ silent: true }));

  const applyFilters = () => fetchTransactions();

  const resetFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    fetchTransactions({ q: "", dateFrom: "", dateTo: "", officeId: officeIdFromUrl || undefined });
  };

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8" dir="rtl">
      {/* شريط البحث — الأعلى */}
      <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm">
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #1E6B3A, #B08D57)" }}
          aria-hidden
        />
        <div className="border-b border-[#c9d6e3] bg-gradient-to-br from-[#1E6B3A]/5 to-transparent px-4 py-4 sm:px-5">
          <h2 className="font-semibold text-[#1e3a5f]">المعاملات</h2>
          <p className="mt-0.5 text-sm text-[#5a6c7d]">جميع المعاملات من جميع المكاتب</p>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          {/* شريط البحث */}
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-[#5a6c7d]">بحث (مواطن / رقم)</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="اسم المواطن أو الرقم..."
              className="w-full rounded-lg border border-[#c9d6e3] bg-white px-3 py-2 text-sm text-[#1B1B1B] placeholder:text-[#9ca3af] focus:border-[#1E6B3A] focus:outline-none focus:ring-1 focus:ring-[#1E6B3A]"
            />
          </div>
          {/* فلترة زمنية */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5a6c7d]">من تاريخ</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-[#c9d6e3] bg-white px-3 py-2 text-sm text-[#1B1B1B] focus:border-[#1E6B3A] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5a6c7d]">إلى تاريخ</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-[#c9d6e3] bg-white px-3 py-2 text-sm text-[#1B1B1B] focus:border-[#1E6B3A] focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyFilters}
                disabled={loading}
                className="rounded-lg bg-[#1E6B3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#175a2e] disabled:opacity-60"
              >
                {loading ? "جاري التحميل…" : "تطبيق"}
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-[#c9d6e3] bg-white px-4 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f8fafc]"
              >
                إعادة تعيين
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* جدول المعاملات */}
      <div className="overflow-hidden rounded-xl border border-[#c9d6e3] bg-white shadow-sm">
        {loading && !transactions.length ? (
          <div className="p-8 text-center text-[#5a6c7d]">جاري التحميل…</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-[#5a6c7d]">لا توجد معاملات</div>
        ) : (
          <>
            {/* ترويسة الجدول مع عدد النتائج */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c9d6e3] bg-[#f8fafc] px-4 py-3 sm:px-5">
              <span className="text-sm font-medium text-[#1e3a5f]">جدول المعاملات</span>
              <span className="text-xs text-[#5a6c7d]">
                عدد النتائج: <strong className="font-semibold text-[#1B1B1B]">{transactions.length}</strong>
              </span>
            </div>
            {/* بطاقات موبايل — شريط أفقي + تفاصيل قابلة للتوسيع */}
            <div className="block space-y-0 sm:hidden">
              {transactions.map((t, i) => {
                const isExpanded = expandedIds.has(t.id);
                const attachments = getAttachmentsList(t.attachments);
                return (
                  <div key={t.id} className="border-b border-[#c9d6e3]/50 last:border-b-0">
                    <div className="flex min-w-0 items-center justify-between gap-2 px-4 py-3">
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          className="inline-flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-md bg-[#e8ecf0] px-2 text-xs font-medium text-[#5a6c7d]"
                          title="التسلسل"
                        >
                          {i + 1}
                        </span>
                        <span className="truncate font-medium text-[#1B1B1B]">{t.citizenName || "—"}</span>
                        <span className="h-4 w-px shrink-0 bg-[#c9d6e3]" aria-hidden />
                        <span className="shrink-0 whitespace-nowrap text-sm text-[#5a6c7d]" dir="ltr" title={fmtSerialNumber(t.serialNumber)}>{fmtSerialNumber(t.serialNumber)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpand(t.id)}
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
                      <TransactionDetailContent t={t} i={i} attachments={attachments} />
                    )}
                  </div>
                );
              })}
            </div>
            {/* جدول — شريط أفقي (التسلسل، المواطن، الرقم، مثلث) + تفاصيل قابلة للتوسيع */}
            <div className="hidden sm:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-right">
                  <thead>
                    <tr className="border-b border-[#c9d6e3] bg-[#f8fafc] text-sm font-medium text-[#5a6c7d]">
                      <th className="w-16 py-3 pr-2">التسلسل</th>
                      <th className="py-3 pr-2">اسم المواطن</th>
                      <th className="min-w-[10rem] border-l border-[#c9d6e3]/70 py-3 pr-2 pl-4">الرقم التسلسلي</th>
                      <th className="w-14 py-3 pr-2">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, i) => {
                      const isExpanded = expandedIds.has(t.id);
                      const attachments = getAttachmentsList(t.attachments);
                      return (
                        <React.Fragment key={t.id}>
                          <tr className="border-b border-[#c9d6e3]/50">
                            <td className="py-3 pr-2">
                              <span
                                className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-[#e8ecf0] px-2 text-sm font-medium text-[#5a6c7d]"
                                title="التسلسل"
                              >
                                {i + 1}
                              </span>
                            </td>
                            <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{t.citizenName || "—"}</td>
                            <td className="min-w-[10rem] border-l border-[#c9d6e3]/70 py-3 pr-2 pl-4 text-[#1B1B1B]">
                              <span className="whitespace-nowrap" dir="ltr" title={fmtSerialNumber(t.serialNumber)}>{fmtSerialNumber(t.serialNumber)}</span>
                              {t.urgent && (
                                <span className="mr-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800" title="عاجلة">عاجلة</span>
                              )}
                            </td>
                            <td className="py-3 pr-2">
                              <button
                                type="button"
                                onClick={() => toggleExpand(t.id)}
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
                            <tr>
                              <td colSpan={4} className="bg-[#f8fafc] p-0">
                                <div className="px-4 py-4 sm:px-5">
                                  <TransactionDetailContent t={t} i={i} attachments={attachments} />
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SupervisorTransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" dir="rtl">
          <div className="animate-pulse rounded-xl border border-[#c9d6e3] bg-white p-8">
            <div className="h-6 w-1/3 rounded bg-[#e8ecf0]" />
            <div className="mt-4 h-4 w-1/2 rounded bg-[#e8ecf0]" />
          </div>
        </div>
      }
    >
      <SupervisorTransactionsContent />
    </Suspense>
  );
}
