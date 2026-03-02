"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

export type ReceiptData = {
  citizenName: string | null;
  citizenPhone: string | null;
  citizenAddress: string | null;
  citizenMinistry: string | null;
  citizenDepartment: string | null;
  citizenOrganization: string | null;
  transactionType: string | null;
  formationName: string | null;
  subDeptName: string | null;
  officeName: string | null;
  serialNumber: string | null;
  followUpUrl: string | null;
  submissionDate: string | null;
  createdAt: string | null;
};

const PRINT_STYLES = `
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  html, body { min-height: 100%; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; }
  .receipt-wrap {
    min-height: 100vh; min-height: 100dvh;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 16px; max-width: 100%;
    page-break-inside: avoid;
  }
  .receipt-wrap h3 { font-size: 15px; margin: 12px 0 8px; padding-bottom: 8px; border-bottom: 2px solid #ddd; font-weight: bold; }
  .receipt-wrap table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .receipt-wrap td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  .receipt-wrap td:first-child { width: 38%; color: #555; font-weight: 500; }
  .receipt-wrap > div { margin-bottom: 8px !important; }
  .receipt-wrap [class*="grid"] { display: flex !important; gap: 24px !important; margin-top: 16px !important; flex-wrap: wrap; justify-content: center; align-items: flex-start; flex: 1; }
  .receipt-wrap [class*="grid"] > div { padding: 16px !important; min-width: 0; flex: 1; max-width: 280px; }
  .receipt-wrap svg { width: 140px !important; height: 140px !important; max-width: 140px !important; max-height: 140px !important; }
  .receipt-wrap [class*="grid"] h3 { margin-top: 0 !important; }
  .receipt-wrap [class*="grid"] p { margin: 8px 0 !important; font-size: 11px !important; }
  @media print {
    html, body { height: 100%; min-height: 100%; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .receipt-wrap { min-height: 267mm; padding: 12px; }
  }
`;

function formatDateAr(s: string | null): string {
  if (!s) return "—";
  try {
    return new Intl.DateTimeFormat("ar-IQ", {
      dateStyle: "medium",
      numberingSystem: "arab",
    }).format(new Date(s));
  } catch {
    return s;
  }
}

export function TransactionReceipt({
  receipt,
  mode = "standalone",
  onClose,
  backHref,
  backLabel,
  showStandaloneNav = true,
  bannerText,
  hidePrintButton = false,
}: {
  receipt: ReceiptData;
  mode?: "standalone" | "modal";
  onClose?: () => void;
  backHref?: string;
  backLabel?: string;
  showStandaloneNav?: boolean;
  bannerText?: string;
  hidePrintButton?: boolean;
}) {
  const defaultBackHref = "/reception/citizens";
  const defaultBackLabel = "العودة إلى شؤون المواطنين";
  const href = backHref ?? defaultBackHref;
  const label = backLabel ?? defaultBackLabel;
  const handlePrint = () => {
    const content = document.getElementById("receipt-content");
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("الرجاء السماح بالنوافذ المنبثقة للطباعة");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head><meta charset="utf-8"><title>وصل المعاملة</title>
      <style>${PRINT_STYLES}</style>
      </head>
      <body><div class="receipt-wrap">${content.innerHTML}</div></body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleWhatsApp = () => {
    const ph = receipt.citizenPhone?.replace(/\D/g, "") || "";
    if (!ph) {
      alert("لا يوجد رقم هاتف لإرسال الرسالة إليه");
      return;
    }
    const sn = receipt.serialNumber ? `2026-${receipt.serialNumber}` : receipt.serialNumber;
    const trackBase = typeof window !== "undefined" ? `${window.location.origin}/track` : (receipt.followUpUrl || "").split("?")[0] || "/track";
    const citizenName = receipt.citizenName?.trim() || "المواطن";
    const msg = `مرحباً ${citizenName}،

تم تسجيل معاملتك بنجاح في بوابة الصادقون.

رقم المعاملة: ${sn}

لمتابعة معاملتك يرجى الدخول على الرابط:
${trackBase}

وإدخال:
• رقم معاملتك: ${receipt.serialNumber || sn}
• رقم هاتفك: ${receipt.citizenPhone || ""}`;
    const waUrl = `https://wa.me/964${ph.startsWith("0") ? ph.slice(1) : ph}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const Row = ({
    label,
    value,
    dir,
  }: {
    label: string;
    value: string | null;
    dir?: "ltr" | "rtl";
  }) => (
    <tr>
      <td className="py-1.5 text-[#5a5a5a]" style={{ width: "40%" }}>
        {label}
      </td>
      <td className="font-medium" dir={dir}>
        {value || "—"}
      </td>
    </tr>
  );

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      {mode === "standalone" && showStandaloneNav && (
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={href}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-gray-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {label}
          </Link>
          <h1 className="text-xl font-bold text-[#1B1B1B]">وصل المعاملة</h1>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 rounded border border-[#1E6B3A]/20 bg-[#1E6B3A]/5 p-4 text-[#1E6B3A]">
          <svg className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold">
            {bannerText ?? (mode === "modal" ? "عرض وصل المعاملة" : "تم تسجيل المعاملة بنجاح")}
          </span>
        </div>
        <p className="mt-2 text-sm text-[#5a5a5a]">
          رقم المعاملة:{" "}
          <strong className="font-bold text-[#1E6B3A]" dir="ltr">
            {receipt.serialNumber ? `2026-${receipt.serialNumber}` : "—"}
          </strong>
        </p>

        <div id="receipt-content" className="mt-6 space-y-4">
          <h3 className="border-b border-gray-200 pb-2 font-bold text-[#1B1B1B]">معلومات المواطن</h3>
          <table className="w-full text-sm">
            <tbody>
              <Row label="اسم المواطن" value={receipt.citizenName} />
              <Row label="رقم الهاتف" value={receipt.citizenPhone} dir="ltr" />
              <Row label="العنوان" value={receipt.citizenAddress} />
              {(receipt.citizenMinistry || receipt.citizenDepartment || receipt.citizenOrganization) && (
                <Row
                  label="جهة العمل"
                  value={[receipt.citizenMinistry, receipt.citizenDepartment, receipt.citizenOrganization]
                    .filter(Boolean)
                    .join(" / ")}
                />
              )}
            </tbody>
          </table>

          <h3 className="border-b border-gray-200 pb-2 font-bold text-[#1B1B1B]">معلومات المعاملة</h3>
          <table className="w-full text-sm">
            <tbody>
              <Row label="نوع المعاملة" value={receipt.transactionType} />
              <Row label="الوزارة أو الجهة المراد مخاطبتها" value={receipt.formationName} />
              <Row label="الدائرة الفرعية" value={receipt.subDeptName} />
              <Row label="تاريخ التقديم" value={receipt.submissionDate ? formatDateAr(receipt.submissionDate) : null} />
            </tbody>
          </table>

          <h3 className="border-b border-gray-200 pb-2 font-bold text-[#1B1B1B]">معلومات المكتب</h3>
          <table className="w-full text-sm">
            <tbody>
              <Row
                label="رقم المعاملة"
                value={receipt.serialNumber ? `2026-${receipt.serialNumber}` : null}
                dir="ltr"
              />
              <Row label="اسم المكتب" value={receipt.officeName} />
              <Row label="تاريخ التسجيل" value={receipt.createdAt ? formatDateAr(receipt.createdAt) : null} />
            </tbody>
          </table>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 border-b border-gray-200 pb-2 text-sm font-bold text-[#1B1B1B]">
                باركود تفاصيل المعاملة
              </h3>
              <p className="mb-3 text-xs text-[#5a5a5a]">
                صحة صدور المعاملة — يحتوي على التفاصيل الأساسية للتحقق الرسمي من بوابة الصادقون
              </p>
              <div className="flex justify-center">
                <QRCodeSVG
                  value={[
                    "بوابة الصادقون — صحة صدور المعاملة",
                    "---------------------------",
                    `اسم المواطن: ${receipt.citizenName || "—"}`,
                    `المكتب: ${receipt.officeName || "—"}`,
                    `رقم الهاتف: ${receipt.citizenPhone || "—"}`,
                    `رقم المعاملة: ${receipt.serialNumber ? `2026-${receipt.serialNumber}` : "—"}`,
                    `نوع المعاملة: ${receipt.transactionType || "—"}`,
                    receipt.formationName ? `الجهة المخاطبة: ${receipt.formationName}` : null,
                    receipt.subDeptName ? `الدائرة: ${receipt.subDeptName}` : null,
                    receipt.createdAt ? `تاريخ التسجيل: ${formatDateAr(receipt.createdAt)}` : null,
                    "---------------------------",
                    "صادر عن منصة بوابة الصادقون",
                  ]
                    .filter(Boolean)
                    .join("\n")}
                  size={140}
                  level="M"
                  includeMargin
                  className="rounded border border-gray-200 bg-white p-2"
                />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 border-b border-gray-200 pb-2 text-sm font-bold text-[#1B1B1B]">
                باركود رابط المتابعة
              </h3>
              <p className="mb-3 text-xs text-[#5a5a5a]">
                مسح الباركود يفتح صفحة المتابعة — سيُطلب إدخال رقم هاتفك للمصادقة
              </p>
              <div className="flex justify-center">
                <QRCodeSVG
                  value={receipt.followUpUrl || ""}
                  size={140}
                  level="M"
                  includeMargin
                  className="rounded border border-gray-200 bg-white p-2"
                />
              </div>
              <p className="mt-2 break-all text-center font-mono text-xs text-[#5a5a5a]" dir="ltr">
                {receipt.followUpUrl || "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-row flex-nowrap gap-2 overflow-x-auto pb-1 sm:gap-3">
          {!hidePrintButton && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-[#B08D57] bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B49]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4-1v8m0 0V5a2 2 0 012-2h6a2 2 0 012 2v8" />
              </svg>
              طباعة الوصل
            </button>
          )}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[#25D366] bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#20bd5a]"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            إرسال
          </button>
          {mode === "modal" && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-gray-50"
            >
              إغلاق
            </button>
          )}
          {mode === "standalone" && (
            <Link
              href={href}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-gray-50"
            >
              إنهاء
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
