"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { broadcastDataUpdate } from "@/lib/broadcast-data-update";
import { createPortal } from "react-dom";

type LinkedUser = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  department: string | null;
  address: string | null;
};

type Office = {
  id: string;
  name: string;
  type: string | null;
  location: string | null;
  status: string;
  managerId: string | null;
  manager: { id: string; name: string | null; email: string } | null;
  managerName: string | null;
  managerPhone: string | null;
  managerAvatarUrl: string | null;
  assignmentDate: string | null;
  userCount: number;
  transactionCount: number;
  createdAt: string;
  linkedUsers?: LinkedUser[];
};

const BORDER_RADIUS = "rounded-xl";
const INPUT_CLASS =
  "w-full rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25";

function isValidEmailOrUsername(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  return emailRegex.test(v) || (usernameRegex.test(v) && v.length >= 2);
}

function OfficeModal({
  open,
  onClose,
  initialData,
  onSubmit,
  submitting,
  error,
  onErrorClear,
}: {
  open: boolean;
  onClose: () => void;
  initialData?: Office | null;
  onSubmit: (data: {
    name: string;
    managerName: string;
    managerPhone: string;
    managerAvatarUrl: string | null;
    assignmentDate: string;
    location: string;
    email?: string;
    password?: string;
  }) => Promise<void>;
  submitting: boolean;
  error: string;
  onErrorClear: () => void;
}) {
  const [name, setName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [managerAvatarUrl, setManagerAvatarUrl] = useState<string | null>(null);
  const [assignmentDate, setAssignmentDate] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!initialData;
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      if (!prevOpenRef.current) {
        prevOpenRef.current = true;
        if (initialData) {
          setName(initialData.name || "");
          setManagerName(initialData.managerName || "");
          setManagerPhone(initialData.managerPhone || "");
          setManagerAvatarUrl(initialData.managerAvatarUrl || null);
          setAssignmentDate(
            initialData.assignmentDate ? initialData.assignmentDate.slice(0, 10) : ""
          );
          setLocation(initialData.location || "");
          setEmail(initialData.manager?.email || "");
          setPassword("");
          setConfirmPassword("");
        } else {
          setName("");
          setManagerName("");
          setManagerPhone("");
          setManagerAvatarUrl(null);
          setAssignmentDate("");
          setLocation("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
        }
        setShowPassword(false);
        setShowConfirmPassword(false);
        onErrorClear();
      }
    } else {
      prevOpenRef.current = false;
    }
  }, [open, initialData, onErrorClear]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const text = await res.text();
      let data: { url?: string; error?: string } = {};
      try {
        if (text.trim()) data = JSON.parse(text);
      } catch {
        data = { error: "استجابة غير صالحة" };
      }
      if (res.ok && data.url) setManagerAvatarUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onErrorClear();
    if (!name.trim()) return;
    if (!isEdit) {
      if (!email.trim()) return;
      if (!isValidEmailOrUsername(email)) return;
      if (password.length < 8) return;
      if (password !== confirmPassword) return;
    }
    await onSubmit({
      name: name.trim(),
      managerName: managerName.trim(),
      managerPhone: managerPhone.trim(),
      managerAvatarUrl,
      assignmentDate: assignmentDate.trim(),
      location: location.trim(),
      ...(!isEdit && { email: email.trim().toLowerCase(), password }),
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1B1B1B]">
          {isEdit ? "تعديل مكتب" : "إضافة مكتب جديد"}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              اسم المكتب *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم المكتب"
              className={INPUT_CLASS}
            />
          </div>
          {!isEdit && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                  البريد الإلكتروني / الاسم المستخدم *
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="بريد إلكتروني أو اسم مستخدم (للدخول إلى النظام)"
                  className={INPUT_CLASS}
                  dir="ltr"
                  autoComplete="username"
                />
                <p className="mt-1 text-xs text-[#5a5a5a]">
                  يستخدمه مدير المكتب لتسجيل الدخول — يقبل بريد (user@example.com) أو اسم مستخدم
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                  كلمة المرور *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 أحرف على الأقل"
                    minLength={8}
                    className={INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]"
                    aria-label={showPassword ? "إخفاء" : "إظهار"}
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                  تأكيد كلمة المرور *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    minLength={8}
                    className={INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]"
                    aria-label={showConfirmPassword ? "إخفاء" : "إظهار"}
                    title={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">كلمة المرور غير متطابقة</p>
                )}
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              اسم مسؤول / مدير المكتب
            </label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="الاسم الكامل"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              صورة شخصية (المدير)
            </label>
            <div className="flex items-center gap-3">
              {managerAvatarUrl && (
                <img
                  src={managerAvatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover border border-[#d4cfc8]"
                />
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
                <span
                  className={`inline-block rounded-xl border border-[#d4cfc8] bg-white px-3 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed] ${
                    uploading ? "opacity-60" : ""
                  }`}
                >
                  {uploading ? "جاري الرفع…" : managerAvatarUrl ? "تغيير الصورة" : "اختر صورة"}
                </span>
              </label>
              {managerAvatarUrl && (
                <button
                  type="button"
                  onClick={() => setManagerAvatarUrl(null)}
                  className="text-sm text-red-600 hover:underline"
                >
                  إزالة
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={managerPhone}
              onChange={(e) => setManagerPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              تاريخ التكليف
            </label>
            <input
              type="date"
              value={assignmentDate}
              onChange={(e) => setAssignmentDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className={INPUT_CLASS}
              title="لا يُقبل تاريخ مستقبلي"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              عنوان المكتب
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="العنوان الكامل"
              className={INPUT_CLASS}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 ${BORDER_RADIUS} border border-[#d4cfc8] bg-white px-4 py-2.5 font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                (!isEdit &&
                  (password.length < 8 ||
                    password !== confirmPassword ||
                    !isValidEmailOrUsername(email)))
              }
              className={`flex-1 ${BORDER_RADIUS} bg-[#1E6B3A] px-4 py-2.5 font-medium text-white transition hover:bg-[#175a2e] disabled:opacity-60`}
            >
              {submitting ? "جاري الحفظ…" : isEdit ? "حفظ التعديلات" : "إضافة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OfficeViewModal({
  open,
  onClose,
  office,
  onPasswordChanged,
}: {
  open: boolean;
  onClose: () => void;
  office: Office | null;
  onPasswordChanged?: () => void;
}) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const managerId = office?.manager?.id;

  const resetPasswordForm = () => {
    setShowChangePassword(false);
    setNewPassword("");
    setConfirmPassword("");
    setPwdError("");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (!managerId) return;
    if (newPassword.length < 8) {
      setPwdError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("كلمة المرور غير متطابقة");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${managerId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const text = await res.text();
      let data: { error?: string } = {};
      try {
        if (text.trim()) data = JSON.parse(text);
      } catch { /* ignore */ }
      if (res.ok) {
        resetPasswordForm();
        onPasswordChanged?.();
      } else {
        setPwdError(data.error || "فشل تغيير كلمة المرور");
      }
    } catch {
      setPwdError("حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setShowChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setPwdError("");
    }
  }, [open]);

  if (!open || !office) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#d4cfc8] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d4cfc8] bg-gradient-to-b from-[#f6f3ed] to-white px-6 py-4">
          <h3 className="text-xl font-semibold text-[#1B1B1B]">تفاصيل المكتب</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#5a5a5a] hover:bg-[#f6f3ed] hover:text-[#1B1B1B]"
            aria-label="إغلاق"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/30 p-4">
            {office.managerAvatarUrl ? (
              <img
                src={office.managerAvatarUrl}
                alt=""
                className="h-20 w-20 rounded-full object-cover border-2 border-[#d4cfc8]"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#d4cfc8]/40 text-2xl font-bold text-[#5a5a5a]">
                {(office.manager?.name || office.name || "م").charAt(0)}
              </div>
            )}
            <div>
              <h4 className="text-lg font-bold text-[#1B1B1B]">{office.name}</h4>
              <p className="text-sm text-[#5a5a5a]">
                {office.status === "ACTIVE" ? (
                  <span className="text-[#1E6B3A] font-medium">مفعّل</span>
                ) : (
                  <span className="text-amber-600 font-medium">معطّل</span>
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="اسم المكتب" value={office.name} />
            <DetailItem label="نوع المكتب" value={office.type} />
            <DetailItem label="العنوان" value={office.location} />
            <DetailItem label="عدد المستخدمين المرتبطين" value={String(office.userCount ?? 0)} />
            <DetailItem label="عدد المعاملات" value={String(office.transactionCount ?? 0)} />
          </div>

          <div className="rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/20 p-4">
            <h5 className="mb-3 font-semibold text-[#1B1B1B]">بيانات مدير المكتب</h5>
            <div className="space-y-2">
              <DetailItem label="الاسم" value={office.manager?.name || office.managerName} />
              <DetailItem label="رقم الهاتف" value={office.managerPhone} />
              <DetailItem
                label="تاريخ التكليف"
                value={
                  office.assignmentDate
                    ? (() => {
                        try {
                          return new Intl.DateTimeFormat("ar-IQ", {
                            dateStyle: "medium",
                            numberingSystem: "arab",
                          }).format(new Date(office.assignmentDate));
                        } catch {
                          return office.assignmentDate;
                        }
                      })()
                    : null
                }
              />
              <DetailItem label="الاسم المستخدم (للدخول)" value={office.manager?.email} dir="ltr" />
              <div className="pt-2 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[#5a5a5a]">كلمة المرور: </span>
                  <span className="text-sm text-[#5a5a5a]">مخزنة بشكل مشفر ولا يمكن عرضها لأسباب أمنية</span>
                  {managerId && (
                    <>
                      {!showChangePassword ? (
                        <button
                          type="button"
                          onClick={() => setShowChangePassword(true)}
                          className="text-sm font-medium text-[#1E6B3A] hover:underline"
                        >
                          تغيير كلمة المرور
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={resetPasswordForm}
                          className="text-sm font-medium text-[#5a5a5a] hover:underline"
                        >
                          إلغاء
                        </button>
                      )}
                    </>
                  )}
                </div>
                {showChangePassword && managerId && (
                  <form onSubmit={handleChangePassword} className="rounded-lg border border-[#d4cfc8]/60 bg-white p-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">كلمة المرور الجديدة</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="8 أحرف على الأقل"
                          minLength={8}
                          className={INPUT_CLASS}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]"
                          aria-label={showPassword ? "إخفاء" : "إظهار"}
                        >
                          {showPassword ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">تأكيد كلمة المرور</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="أعد إدخال كلمة المرور"
                          minLength={8}
                          className={INPUT_CLASS}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((s) => !s)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]"
                          aria-label={showConfirmPassword ? "إخفاء" : "إظهار"}
                        >
                          {showConfirmPassword ? (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetPasswordForm}
                        className="rounded-lg border border-[#d4cfc8] px-3 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || newPassword.length < 8 || newPassword !== confirmPassword}
                        className="rounded-lg bg-[#1E6B3A] px-3 py-2 text-sm font-medium text-white hover:bg-[#175a2e] disabled:opacity-60"
                      >
                        {submitting ? "جاري الحفظ…" : "حفظ كلمة المرور"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {office.linkedUsers && office.linkedUsers.length > 0 && (
            <div className="rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/20 p-4">
              <h5 className="mb-3 font-semibold text-[#1B1B1B]">الحسابات المرتبطة بالمكتب</h5>
              <div className="space-y-3">
                {office.linkedUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-lg border border-[#d4cfc8]/40 bg-white p-3">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover border border-[#d4cfc8]" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d4cfc8]/40 text-sm font-medium text-[#5a5a5a]">
                        {(u.name || u.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#1B1B1B]">{u.name || u.email}</p>
                      <p className="text-sm text-[#5a5a5a]" dir="ltr">{u.email}</p>
                      {u.phone && <p className="text-sm text-[#5a5a5a]">{u.phone}</p>}
                      {u.department && <p className="text-sm text-[#5a5a5a]">وظيفة: {u.department}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#d4cfc8] px-4 py-2.5 font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  dir,
}: {
  label: string;
  value: string | null | undefined;
  dir?: "ltr" | "rtl";
}) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium text-[#5a5a5a]">{label}</p>
      <p className={`mt-0.5 text-[#1B1B1B] ${dir ? "" : ""}`} dir={dir}>
        {value}
      </p>
    </div>
  );
}

function LinkedAccountsCell({ office }: { office: Office }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const linkedUsers = office.linkedUsers ?? [];
  const count = linkedUsers.length;

  const updatePosition = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const popoverWidth = 320;
    const spaceRight = rect.right;
    const spaceLeft = window.innerWidth - rect.left;
    const alignRight = spaceRight >= spaceLeft;
    setPos({
      top: rect.bottom + 4,
      right: alignRight ? window.innerWidth - rect.right : window.innerWidth - rect.left,
    });
  }, []);

  const handleToggle = useCallback(() => {
    if (!open) {
      updatePosition();
    }
    setOpen((o) => !o);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => updatePosition();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  if (count === 0) {
    return <span className="text-[#5a5a5a]">—</span>;
  }

  const popoverContent = open && (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40"
        onClick={() => setOpen(false)}
        aria-label="إغلاق"
      />
      <div
        className="fixed z-50 min-w-[280px] max-w-[340px] rounded-xl border border-[#d4cfc8] bg-white py-2 shadow-xl"
        role="dialog"
        aria-label="الحسابات المرتبطة"
        style={{ top: pos.top, right: pos.right }}
      >
        <div className="border-b border-[#d4cfc8] px-4 py-2">
          <p className="text-sm font-semibold text-[#1B1B1B]">الحسابات المرتبطة — {office.name}</p>
        </div>
        <div className="max-h-[280px] overflow-y-auto px-2 py-1">
          {linkedUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-lg border border-[#d4cfc8]/50 bg-[#f6f3ed]/30 px-3 py-2.5"
            >
              {u.avatarUrl ? (
                <img src={u.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover border border-[#d4cfc8]" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d4cfc8]/40 text-sm font-medium text-[#5a5a5a]">
                  {(u.name || u.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate font-medium text-[#1B1B1B]">{u.name || u.email}</p>
                <p className="truncate text-xs text-[#5a5a5a]" dir="ltr">{u.email}</p>
                {u.phone && <p className="text-xs text-[#5a5a5a]">{u.phone}</p>}
                {u.department && <p className="text-xs text-[#5a5a5a]">وظيفة: {u.department}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const shouldRenderPortal = open && typeof document !== "undefined";

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4cfc8] bg-[#f6f3ed]/50 px-3 py-1.5 text-sm font-medium text-[#1B1B1B] transition hover:bg-[#f6f3ed] hover:border-[#B08D57]/50"
        title="عرض الحسابات المرتبطة"
      >
        <svg className="h-4 w-4 text-[#5a5a5a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        عرض ({count})
      </button>
      {shouldRenderPortal && createPortal(popoverContent, document.body)}
    </div>
  );
}

export default function OfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [viewingOffice, setViewingOffice] = useState<Office | null>(null);

  const loadOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/offices");
      const text = await res.text();
      let data: Office[] = [];
      try {
        if (text.trim()) {
          const parsed = JSON.parse(text);
          data = Array.isArray(parsed) ? parsed : [];
        }
      } catch {
        data = [];
      }
      if (res.ok) setOffices(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffices();
  }, [loadOffices]);

  const handleSubmit = async (data: {
    name: string;
    managerName: string;
    managerPhone: string;
    managerAvatarUrl: string | null;
    assignmentDate: string;
    location: string;
    email?: string;
    password?: string;
  }) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        managerName: data.managerName || null,
        managerPhone: data.managerPhone || null,
        managerAvatarUrl: data.managerAvatarUrl,
        assignmentDate: data.assignmentDate ? new Date(data.assignmentDate).toISOString() : null,
        location: data.location || null,
      };
      if (data.email) payload.email = data.email;
      if (data.password) payload.password = data.password;
      if (editingOffice) {
        const res = await fetch(`/api/super-admin/offices/${editingOffice.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        let body: Office & { error?: string } = editingOffice;
        try {
          if (text.trim()) body = JSON.parse(text) as Office & { error?: string };
        } catch { /* ignore */ }
        if (!res.ok) {
          setSubmitError(body.error || "فشل التحديث");
          return;
        }
        setOffices((prev) =>
          prev.map((o) => (o.id === editingOffice.id ? body : o))
        );
        broadcastDataUpdate();
      } else {
        const res = await fetch("/api/super-admin/offices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        let body: Office & { error?: string } = {} as Office & { error?: string };
        try {
          if (text.trim()) body = JSON.parse(text) as Office & { error?: string };
        } catch { /* ignore */ }
        if (!res.ok) {
          setSubmitError(body.error || "فشل الإضافة");
          return;
        }
        setOffices((prev) => [body, ...prev]);
        broadcastDataUpdate();
      }
      setModalOpen(false);
      setEditingOffice(null);
    } catch {
      setSubmitError("حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (office: Office) => {
    if (!confirm(`هل تريد حذف المكتب «${office.name}»؟ لا يمكن التراجع.`)) return;
    setDeletingId(office.id);
    try {
      const res = await fetch(`/api/super-admin/offices/${office.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setOffices((prev) => prev.filter((o) => o.id !== office.id));
        broadcastDataUpdate();
      } else {
        const text = await res.text();
        let body: { error?: string } = {};
        try {
          if (text.trim()) body = JSON.parse(text);
        } catch { /* ignore */ }
        alert(body.error || "فشل الحذف");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const toggleStatus = async (office: Office) => {
    const nextStatus = office.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTogglingId(office.id);
    try {
      const res = await fetch(`/api/super-admin/offices/${office.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const text = await res.text();
      let body: Office & { error?: string } = office;
      try {
        if (text.trim()) body = JSON.parse(text) as Office & { error?: string };
      } catch { /* ignore */ }
      if (res.ok) {
        setOffices((prev) =>
          prev.map((o) => (o.id === office.id ? body : o))
        );
        broadcastDataUpdate();
      } else {
        alert(body.error || "فشل التحديث");
      }
    } finally {
      setTogglingId(null);
    }
  };

  const openAddModal = () => {
    setEditingOffice(null);
    setModalOpen(true);
  };

  const openEditModal = (office: Office) => {
    setEditingOffice(office);
    setModalOpen(true);
  };

  function formatDate(s: string | null): string {
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

  function formatDateShort(s: string | null): string {
    if (!s) return "";
    try {
      return new Intl.DateTimeFormat("ar-IQ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        numberingSystem: "arab",
      }).format(new Date(s));
    } catch {
      return s;
    }
  }

  function escapeCsv(val: string): string {
    const s = String(val ?? "").replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  }

  const exportToExcel = () => {
    const headers = [
      "م",
      "اسم المكتب",
      "نوع المكتب",
      "مدير المكتب",
      "رقم الهاتف",
      "تاريخ التكليف",
      "العنوان",
      "عدد المستخدمين",
      "عدد المعاملات",
      "الحالة",
    ];
    const rows = offices.map((o, i) =>
      [
        i + 1,
        o.name || "",
        o.type || "",
        o.manager?.name || o.managerName || "",
        o.managerPhone || "",
        o.assignmentDate ? formatDateShort(o.assignmentDate) : "",
        o.location || "",
        String(o.userCount ?? 0),
        String(o.transactionCount ?? 0),
        o.status === "ACTIVE" ? "مفعّل" : "معطّل",
      ].map((v) => escapeCsv(String(v)))
    );
    const csv = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `جدول_المكاتب_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalCount = offices.length;
  const activeCount = offices.filter((o) => o.status === "ACTIVE").length;
  const inactiveCount = offices.filter((o) => o.status === "INACTIVE").length;

  const statCards = [
    {
      label: "عدد المكاتب الكلية",
      value: totalCount,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      className: "text-[#1E6B3A]",
      bgClassName: "bg-[#1E6B3A]/10",
    },
    {
      label: "عدد المكاتب المفعلة",
      value: activeCount,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      className: "text-[#1E6B3A]",
      bgClassName: "bg-[#1E6B3A]/10",
    },
    {
      label: "عدد المكاتب المعطلة",
      value: inactiveCount,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      className: "text-amber-600",
      bgClassName: "bg-amber-100",
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print-table-wrap { box-shadow: none !important; border: 1px solid #1e3a5f !important; overflow: visible !important; }
          .print-table-wrap .overflow-x-auto { overflow: visible !important; }
          .print-table-wrap table { width: 100% !important; min-width: 0 !important; border-collapse: collapse; font-size: 8pt; table-layout: fixed; }
          .print-table-wrap th, .print-table-wrap td { border: 1px solid #1e3a5f; padding: 3px 4px; text-align: right; overflow: hidden; word-break: break-word; }
          .print-table-wrap thead th { background: #1e3a5f !important; color: white !important; font-weight: bold; }
          .print-header { margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #1e3a5f; }
          .print-header h2 { font-size: 14pt; margin: 0; color: #1e3a5f; }
          .print-header p { font-size: 9pt; margin: 4px 0 0; color: #5a6c7d; }
        }
      `}</style>
      {/* ترويسة الطباعة — تظهر عند الطباعة فقط */}
      <div className="hidden print:block print-header">
        <h2>جدول المكاتب — بوابة الصادقون</h2>
        <p>تاريخ الطباعة: {formatDate(new Date().toISOString())}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">إدارة المكاتب</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportToExcel}
            disabled={loading || offices.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[#5B7C99] bg-[#5B7C99] px-4 py-2.5 font-medium text-white transition hover:bg-[#4a6a85] disabled:opacity-50 print:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            تصدير إكسل
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={loading || offices.length === 0}
            className="flex items-center gap-2 rounded-xl border border-[#1e3a5f] bg-[#1e3a5f] px-4 py-2.5 font-medium text-white transition hover:bg-[#152a45] disabled:opacity-50 print:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl bg-[#1E6B3A] px-4 py-2.5 font-medium text-white transition hover:bg-[#175a2e] print:hidden"
          >
            إضافة مكتب
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col rounded-2xl border border-[#d4cfc8] bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.bgClassName} ${card.className}`}>
              {card.icon}
            </div>
            <p className="mt-3 text-sm font-medium text-[#5a5a5a]">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-[#1B1B1B]">{loading ? "—" : card.value}</p>
          </div>
        ))}
      </section>

      <article className="print-table-wrap rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        {loading ? (
          <p className="py-8 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : offices.length === 0 ? (
          <p className="py-8 text-center text-[#5a5a5a]">لا توجد مكاتب مسجلة.</p>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[900px] print:min-w-0 text-right">
              <thead>
                <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a6c7d]">
                  <th className="py-3 pr-2">م</th>
                  <th className="py-3 pr-2">
                    <span className="print:hidden">اسم المكتب</span>
                    <span className="hidden print:inline">الاسم</span>
                  </th>
                  <th className="py-3 pr-2">
                    <span className="print:hidden">نوع المكتب</span>
                    <span className="hidden print:inline">النوع</span>
                  </th>
                  <th className="py-3 pr-2">
                    <span className="print:hidden">مدير المكتب</span>
                    <span className="hidden print:inline">المدير</span>
                  </th>
                  <th className="py-3 pr-2 print:hidden">الصورة</th>
                  <th className="py-3 pr-2">الهاتف</th>
                  <th className="py-3 pr-2">
                    <span className="print:hidden">تاريخ التكليف</span>
                    <span className="hidden print:inline">التكليف</span>
                  </th>
                  <th className="py-3 pr-2">
                    <span className="print:hidden">الحسابات المرتبطة</span>
                    <span className="hidden print:inline">الحسابات</span>
                  </th>
                  <th className="py-3 pr-2">
                    <span className="print:hidden">عدد المعاملات</span>
                    <span className="hidden print:inline">المعاملات</span>
                  </th>
                  <th className="py-3 pr-2">العنوان</th>
                  <th className="py-3 pr-2">الحالة</th>
                  <th className="py-3 pl-2 print:hidden">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {offices.map((o, idx) => (
                  <tr
                    key={o.id}
                    className="border-b border-[#d4cfc8]/80 last:border-0"
                  >
                    <td className="py-3 pr-2 text-[#5a5a5a]">{idx + 1}</td>
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]">
                      {o.name || "—"}
                    </td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{o.type || "—"}</td>
                    <td className="py-3 pr-2 text-[#1B1B1B]">
                      {o.manager?.name || o.managerName || "—"}
                    </td>
                    <td className="py-3 pr-2 print:hidden">
                      {o.managerAvatarUrl ? (
                        <img
                          src={o.managerAvatarUrl}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover border border-[#d4cfc8]"
                        />
                      ) : (
                        <span className="text-[#5a5a5a]">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">
                      {o.managerPhone || "—"}
                    </td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">
                      {formatDate(o.assignmentDate)}
                    </td>
                    <td className="py-3 pr-2">
                      <span className="print:hidden">
                        <LinkedAccountsCell office={o} />
                      </span>
                      <span className="hidden print:inline text-[#5a5a5a]">
                        {(o.linkedUsers?.length ?? 0) > 0 ? o.linkedUsers!.length : "—"}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{o.transactionCount ?? 0}</td>
                    <td
                      className="max-w-[160px] truncate py-3 pr-2 text-[#5a5a5a]"
                      title={o.location || undefined}
                    >
                      {o.location || "—"}
                    </td>
                    <td className="py-3 pr-2">
                      <span
                        className={
                          o.status === "ACTIVE"
                            ? "font-medium text-[#1E6B3A]"
                            : "font-medium text-amber-600"
                        }
                      >
                        {o.status === "ACTIVE" ? "مفعّل" : "معطّل"}
                      </span>
                    </td>
                    <td className="py-3 pl-2 print:hidden">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingOffice(o)}
                          className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed]"
                        >
                          عرض
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(o)}
                          className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed]"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(o)}
                          disabled={togglingId === o.id}
                          className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed] disabled:opacity-60"
                        >
                          {togglingId === o.id
                            ? "…"
                            : o.status === "ACTIVE"
                              ? "تعطيل"
                              : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(o)}
                          disabled={deletingId === o.id}
                          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === o.id ? "…" : "حذف"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <OfficeModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingOffice(null);
        }}
        initialData={editingOffice}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={submitError}
        onErrorClear={() => setSubmitError("")}
      />

      <OfficeViewModal
        open={!!viewingOffice}
        onClose={() => setViewingOffice(null)}
        office={viewingOffice}
      />
    </div>
  );
}
