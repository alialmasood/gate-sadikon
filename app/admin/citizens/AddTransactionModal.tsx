"use client";

import { useState, useEffect, useCallback } from "react";
import { broadcastDataUpdate } from "@/lib/broadcast-data-update";
import { useRouter } from "next/navigation";

const TRANSACTION_TYPES = [
  { value: "طلب", label: "طلب" },
  { value: "نقل خدمات بين وزارتين", label: "نقل خدمات بين وزارتين" },
  { value: "نقل داخل الوزارة", label: "نقل داخل الوزارة" },
  { value: "اعادة الى الوظيفة", label: "اعادة الى الوظيفة" },
  { value: "تخصيص قطعة ارض", label: "تخصيص قطعة ارض" },
  { value: "طلب منحة", label: "طلب منحة" },
  { value: "طلب تعيين", label: "طلب تعيين" },
  { value: "طلب تشغيل", label: "طلب تشغيل" },
];

type Formation = { id: string; name: string; type: string };
type SubDept = { id: string; name: string; formationId: string };

const INPUT_CLASS =
  "w-full rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25";

type ReceiptData = {
  citizenName: string | null;
  citizenPhone: string | null;
  citizenAddress: string | null;
  officeName: string | null;
  serialNumber: string | null;
  followUpUrl: string;
  submissionDate: string | null;
  transactionType: string | null;
  transactionTitle: string | null;
};

export default function AddTransactionModal({
  open = true,
  onClose,
  onSuccess,
  asPage = false,
  returnTo,
}: {
  open?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  asPage?: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const [citizenName, setCitizenName] = useState("");
  const [citizenPhone, setCitizenPhone] = useState("");
  const [citizenAddress, setCitizenAddress] = useState("");
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);
  const [employeeSector, setEmployeeSector] = useState("");
  const [citizenMinistry, setCitizenMinistry] = useState("");
  const [citizenDepartment, setCitizenDepartment] = useState("");
  const [citizenOrganization, setCitizenOrganization] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [transactionTitle, setTransactionTitle] = useState("");
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().slice(0, 10));
  const [formationId, setFormationId] = useState("");
  const [subDeptId, setSubDeptId] = useState("");
  const [attachments, setAttachments] = useState<{ url: string; name?: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formationsLoading, setFormationsLoading] = useState(false);
  const [formationsError, setFormationsError] = useState("");
  const [subDepts, setSubDepts] = useState<SubDept[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const loadFormations = useCallback(async () => {
    setFormationsLoading(true);
    setFormationsError("");
    try {
      const res = await fetch("/api/formations", { credentials: "include" });
      const text = await res.text();
      let data: Formation[] = [];
      try {
        if (text.trim()) {
          const parsed = JSON.parse(text);
          data = Array.isArray(parsed) ? parsed : [];
        }
      } catch { /* ignore */ }
      if (res.ok) {
        setFormations(data);
      } else {
        setFormationsError(res.status === 403 ? "لا تملك صلاحية تحميل التشكيلات" : `فشل التحميل (${res.status})`);
        setFormations([]);
      }
    } catch {
      setFormationsError("فشل الاتصال بالخادم");
      setFormations([]);
    } finally {
      setFormationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open || asPage) loadFormations();
  }, [open, asPage, loadFormations]);

  useEffect(() => {
    if (formationId) {
      fetch(`/api/formations/subdepts?formationId=${encodeURIComponent(formationId)}`)
        .then(async (r) => {
          const t = await r.text();
          try {
            return r.ok && t.trim() ? JSON.parse(t) : [];
          } catch {
            return [];
          }
        })
        .then(setSubDepts);
    } else {
      setSubDepts([]);
      setSubDeptId("");
    }
  }, [formationId]);

  const resetForm = useCallback(() => {
    setCitizenName("");
    setCitizenPhone("");
    setCitizenAddress("");
    setIsEmployee(null);
    setEmployeeSector("");
    setCitizenMinistry("");
    setCitizenDepartment("");
    setCitizenOrganization("");
    setTransactionType("");
    setTransactionTitle("");
    setSubmissionDate(new Date().toISOString().slice(0, 10));
    setFormationId("");
    setSubDeptId("");
    setAttachments([]);
    setError("");
    setFormationsError("");
    setReceipt(null);
  }, []);

  useEffect(() => {
    if (!open && !asPage) resetForm();
  }, [open, asPage, resetForm]);

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIndex(index);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const text = await res.text();
      let data: { url?: string; error?: string } = {};
      try {
        if (text.trim()) data = JSON.parse(text);
      } catch {
        data = { error: "استجابة غير صالحة" };
      }
      if (res.ok && data.url) {
        const url = data.url;
        setAttachments((prev) => {
          const next = [...prev];
          next[index] = { url, name: file.name };
          return next;
        });
      } else {
        alert(data.error || "فشل رفع الملف");
      }
    } catch {
      alert("فشل رفع الملف");
    } finally {
      setUploadingIndex(null);
      e.target.value = "";
    }
  };

  const addAttachmentSlot = () => {
    setAttachments((prev) => [...prev, { url: "" }]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!citizenName.trim()) {
      setError("اسم صاحب المعاملة مطلوب");
      return;
    }
    setSubmitting(true);
    try {
      const validAttachments = attachments.filter((a) => a.url);
      const res = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          citizenName: citizenName.trim(),
          citizenPhone: citizenPhone.trim() || null,
          citizenAddress: citizenAddress.trim() || null,
          citizenIsEmployee: isEmployee ?? undefined,
          citizenEmployeeSector: employeeSector || undefined,
          citizenMinistry: employeeSector === "GOVERNMENT" ? (citizenMinistry.trim() || null) : undefined,
          citizenDepartment: employeeSector === "GOVERNMENT" ? (citizenDepartment.trim() || null) : undefined,
          citizenOrganization: (employeeSector === "PRIVATE" || employeeSector === "MIXED") ? (citizenOrganization.trim() || null) : undefined,
          transactionType: transactionType || null,
          transactionTitle: transactionTitle.trim() || null,
          submissionDate: submissionDate || null,
          formationId: formationId || null,
          subDeptId: subDeptId || null,
          attachments: validAttachments.length > 0 ? validAttachments : null,
        }),
      });
      const text = await res.text();
      let data: ReceiptData & { error?: string } = {} as ReceiptData & { error?: string };
      try {
        if (text.trim()) data = JSON.parse(text) as ReceiptData & { error?: string };
      } catch { /* ignore */ }
      if (res.ok) {
        broadcastDataUpdate();
        setReceipt({
          citizenName: data.citizenName,
          citizenPhone: data.citizenPhone,
          citizenAddress: data.citizenAddress,
          officeName: data.officeName,
          serialNumber: data.serialNumber,
          followUpUrl: data.followUpUrl,
          submissionDate: data.submissionDate,
          transactionType: data.transactionType,
          transactionTitle: data.transactionTitle,
        });
        if (asPage && returnTo) router.push(returnTo);
        else onSuccess?.();
      } else {
        setError(data.error || "فشل الحفظ");
      }
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  };

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
      <style>body{font-family:Arial,sans-serif;padding:24px;max-width:400px;margin:0 auto} table{width:100%;border-collapse:collapse} td{padding:8px;border-bottom:1px solid #eee} .label{color:#666;font-size:12px}</style>
      </head>
      <body>${content.innerHTML}</body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleWhatsApp = () => {
    const phone = receipt?.citizenPhone?.replace(/\D/g, "") || "";
    if (!phone) {
      alert("لا يوجد رقم هاتف لإرسال الرسالة إليه");
      return;
    }
    const text = `مرحباً، تم تسجيل معاملتك بنجاح.\nرقم المعاملة: ${receipt?.serialNumber}\nللمتابعة: ${receipt?.followUpUrl}`;
    const waUrl = `https://wa.me/964${phone.startsWith("0") ? phone.slice(1) : phone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const formatDateAr = (s: string | null) => {
    if (!s) return "—";
    try {
      return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", numberingSystem: "arab" }).format(new Date(s));
    } catch {
      return s;
    }
  };

  if (!open && !asPage) return null;

  if (receipt) {
    const receiptContent = (
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
          <div className="flex items-center gap-2 rounded-xl bg-[#1E6B3A]/10 p-4 text-[#1E6B3A]">
            <svg className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">تم حفظ المعاملة بنجاح</span>
          </div>
          <div id="receipt-content" className="mt-6 space-y-2 text-sm">
            <table className="w-full">
              <tbody>
                <tr><td className="label py-1 text-[#5a5a5a]">اسم صاحب المعاملة</td><td className="font-medium">{receipt.citizenName || "—"}</td></tr>
                <tr><td className="label py-1 text-[#5a5a5a]">رقم الهاتف</td><td dir="ltr">{receipt.citizenPhone || "—"}</td></tr>
                <tr><td className="label py-1 text-[#5a5a5a]">اسم المكتب</td><td>{receipt.officeName || "—"}</td></tr>
                <tr><td className="label py-1 text-[#5a5a5a]">التاريخ</td><td>{formatDateAr(receipt.submissionDate)}</td></tr>
                <tr><td className="label py-1 text-[#5a5a5a]">رقم المعاملة</td><td className="font-bold text-[#1E6B3A]" dir="ltr">{receipt.serialNumber || "—"}</td></tr>
                <tr><td className="label py-1 text-[#5a5a5a]">رابط المتابعة</td><td className="break-all text-xs" dir="ltr">{receipt.followUpUrl}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl border border-[#B08D57] bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B49]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4-1v8m0 0V5a2 2 0 012-2h6a2 2 0 012 2v8" />
              </svg>
              طباعة الوصل
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center gap-2 rounded-xl border border-[#25D366] bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#20bd5a]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              إرسال واتساب
            </button>
            <button
              type="button"
              onClick={() => {
                setReceipt(null);
                if (asPage && returnTo) router.push(returnTo);
                else onClose?.();
              }}
              className="rounded-xl border border-[#d4cfc8] px-4 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
            >
              إغلاق
            </button>
          </div>
      </div>
    );
    return (
      <div className={asPage ? "flex min-h-0 flex-1 flex-col items-center p-4" : "fixed inset-0 z-50 flex items-center justify-center p-4"} dir="rtl">
        {!asPage && <div className="absolute inset-0 bg-black/50" aria-hidden />}
        {receiptContent}
      </div>
    );
  }

  const formContent = (
    <div className={`relative w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl ${asPage ? "" : "max-h-[90vh]"}`}>
        <h3 className="text-xl font-semibold text-[#1B1B1B]">إضافة معاملة جديدة</h3>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* معلومات صاحب المعاملة */}
          <div className="rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/30 p-4">
            <h4 className="mb-4 font-semibold text-[#1B1B1B]">معلومات صاحب المعاملة</h4>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">الاسم الكامل *</label>
                <input type="text" value={citizenName} onChange={(e) => setCitizenName(e.target.value)} required className={INPUT_CLASS} placeholder="اسم صاحب المعاملة الكامل" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">رقم الهاتف</label>
                <input type="tel" value={citizenPhone} onChange={(e) => setCitizenPhone(e.target.value)} className={INPUT_CLASS} placeholder="07XXXXXXXX" dir="ltr" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">العنوان</label>
                <input type="text" value={citizenAddress} onChange={(e) => setCitizenAddress(e.target.value)} className={INPUT_CLASS} placeholder="العنوان الكامل" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#1B1B1B]">هل أنت موظف؟</label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="isEmployee"
                      checked={isEmployee === true}
                      onChange={() => { setIsEmployee(true); setEmployeeSector(""); setCitizenMinistry(""); setCitizenDepartment(""); setCitizenOrganization(""); }}
                      className="h-4 w-4 border-[#d4cfc8] text-[#B08D57] focus:ring-[#B08D57]"
                    />
                    <span>نعم</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="isEmployee"
                      checked={isEmployee === false}
                      onChange={() => { setIsEmployee(false); setEmployeeSector(""); setCitizenMinistry(""); setCitizenDepartment(""); setCitizenOrganization(""); }}
                      className="h-4 w-4 border-[#d4cfc8] text-[#B08D57] focus:ring-[#B08D57]"
                    />
                    <span>لا</span>
                  </label>
                </div>
              </div>
              {isEmployee === true && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">نوع التوظيف</label>
                    <select
                      value={employeeSector}
                      onChange={(e) => { setEmployeeSector(e.target.value); setCitizenMinistry(""); setCitizenDepartment(""); setCitizenOrganization(""); }}
                      className={INPUT_CLASS}
                    >
                      <option value="">اختر النوع</option>
                      <option value="GOVERNMENT">موظف حكومي</option>
                      <option value="PRIVATE">قطاع خاص</option>
                      <option value="MIXED">قطاع مشترك</option>
                    </select>
                  </div>
                  {employeeSector === "GOVERNMENT" && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">اسم الوزارة</label>
                        <input type="text" value={citizenMinistry} onChange={(e) => setCitizenMinistry(e.target.value)} className={INPUT_CLASS} placeholder="اسم الوزارة" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">الدائرة</label>
                        <input type="text" value={citizenDepartment} onChange={(e) => setCitizenDepartment(e.target.value)} className={INPUT_CLASS} placeholder="اسم الدائرة" />
                      </div>
                    </>
                  )}
                  {employeeSector === "PRIVATE" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">اسم الجهة أو الشركة</label>
                      <input type="text" value={citizenOrganization} onChange={(e) => setCitizenOrganization(e.target.value)} className={INPUT_CLASS} placeholder="اسم الجهة أو الشركة" />
                    </div>
                  )}
                  {employeeSector === "MIXED" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">اسم الجهة أو الشركة أو الدائرة</label>
                      <input type="text" value={citizenOrganization} onChange={(e) => setCitizenOrganization(e.target.value)} className={INPUT_CLASS} placeholder="اسم الجهة أو الشركة أو الدائرة" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* معلومات المعاملة */}
          <div className="rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/30 p-4">
            <h4 className="mb-4 font-semibold text-[#1B1B1B]">معلومات المعاملة</h4>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">نوع المعاملة</label>
                <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className={INPUT_CLASS}>
                  <option value="">اختر النوع</option>
                  {TRANSACTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">عنوان المعاملة</label>
                <input type="text" value={transactionTitle} onChange={(e) => setTransactionTitle(e.target.value)} className={INPUT_CLASS} placeholder="عنوان المعاملة" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">تاريخ تقديم المعاملة</label>
                <input type="date" value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} className={INPUT_CLASS} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">الوزارة أو الجهة المراد مخاطبتها</label>
                <select
                  value={formationId}
                  onChange={(e) => setFormationId(e.target.value)}
                  className={INPUT_CLASS}
                  disabled={formationsLoading}
                >
                  <option value="">
                    {formationsLoading ? "جاري التحميل…" : "اختر الجهة"}
                  </option>
                  {formations.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {formationsError && (
                  <p className="mt-1 text-xs text-red-600">{formationsError}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">الدائرة الفرعية التابعة للتشكيل</label>
                <select value={subDeptId} onChange={(e) => setSubDeptId(e.target.value)} className={INPUT_CLASS} disabled={!formationId}>
                  <option value="">اختر الدائرة الفرعية</option>
                  {subDepts.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* المرفقات */}
          <div className="rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/30 p-4">
            <h4 className="mb-4 font-semibold text-[#1B1B1B]">المرفقات</h4>
            <div className="space-y-3">
              {(attachments.length === 0 ? [{ url: "" }] : attachments).map((att, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(i, e)} className="hidden" id={`attach-${i}`} disabled={uploadingIndex !== null} />
                  <label htmlFor={`attach-${i}`} className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-[#d4cfc8] bg-white px-3 py-2 text-sm hover:bg-[#f6f3ed]">
                    {att.url ? (
                      <span className="truncate text-[#1E6B3A]">{att.name || "تم الرفع"}</span>
                    ) : (
                      <span className="text-[#5a5a5a]">{uploadingIndex === i ? "جاري الرفع…" : "اختر ملف (صورة أو PDF)"}</span>
                    )}
                  </label>
                  {att.url && (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-[#0D9488] hover:bg-[#ccfbf1]"
                      title="عرض المرفق"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </a>
                  )}
                  {(attachments.length > 1 || att.url) && (
                    <button type="button" onClick={() => removeAttachment(i)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="حذف">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addAttachmentSlot} className="flex items-center gap-2 rounded-xl border border-dashed border-[#d4cfc8] px-4 py-2 text-sm font-medium text-[#5a5a5a] hover:border-[#B08D57] hover:text-[#B08D57]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                إضافة مرفق آخر
              </button>
            </div>
          </div>

          <p className="text-sm text-[#5a5a5a]">
            سيتم إنشاء رقم معاملة فريد (6 أرقام) تلقائياً بعد الحفظ ليمكن صاحب المعاملة من متابعتها.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => (asPage && returnTo ? router.push(returnTo) : onClose?.())}
              className="flex-1 rounded-xl border border-[#d4cfc8] px-4 py-2.5 font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
            >
              إلغاء
            </button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-[#1E6B3A] px-4 py-2.5 font-medium text-white hover:bg-[#175a2e] disabled:opacity-60">
              {submitting ? "جاري الحفظ…" : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    );
  return asPage ? (
    <div className="space-y-6" dir="rtl">
      {formContent}
    </div>
  ) : (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      {formContent}
    </div>
  );
}
