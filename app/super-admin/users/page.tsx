"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Office = { id: string; name: string };

type CreatedAccountUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  avatarUrl: string | null;
  role: string;
  enabled: boolean;
  officeId: string | null;
  office: { id: string; name: string } | null;
  department: string | null;
  assignmentDate: string | null;
  createdAt: string;
  serialNumber?: string | null;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  enabled: boolean;
};

type DelegateUser = User & {
  phone: string | null;
  address: string | null;
  avatarUrl: string | null;
  ministry: string | null;
  department: string | null;
  assignmentDate: string | null;
  serialNumber: string | null;
  officeId: string | null;
  office: { id: string; name: string } | null;
};

type Formation = { id: string; name: string; type: string };
type SubDept = { id: string; name: string; formationId: string };

const BORDER_RADIUS = "rounded-xl";
const INPUT_CLASS = "w-full rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25";

const ROLE_LABELS: Record<string, string> = {
  AUDITOR: "مدقق",
  COORDINATOR: "تنسيق ومتابعة",
  RECEPTION: "استقبال واستعلامات",
  SORTING: "قسم الفرز",
  DOCUMENTATION: "قسم التوثيق",
  USER: "مستخدم",
  SUPER_ADMIN: "سوبر أدمن",
  PARLIAMENT_MEMBER: "عضو مجلس النواب",
};

function isValidUsername(value: string): boolean {
  const v = value.trim();
  return v.length >= 2 && /^[a-zA-Z0-9_.]+$/.test(v);
}

function CreateAccountModal({
  open,
  onClose,
  offices,
  initialData,
  onSubmit,
  submitting,
  error,
  onErrorClear,
}: {
  open: boolean;
  onClose: () => void;
  offices: Office[];
  initialData?: CreatedAccountUser | null;
  onSubmit: (data: {
    name: string;
    email: string;
    password: string;
    officeId: string | null;
    department: string;
    assignmentDate: string;
    phone: string;
    avatarUrl: string | null;
    address: string;
    role: string;
  }) => Promise<void>;
  submitting: boolean;
  error: string;
  onErrorClear: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [officeId, setOfficeId] = useState("");
  const [department, setDepartment] = useState("");
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<string>("COORDINATOR");
  const [uploading, setUploading] = useState(false);

  const isEdit = !!initialData;
  const prevOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (open && justOpened) {
      if (initialData) {
        setName(initialData.name || "");
        setEmail(initialData.email || "");
        setPassword("");
        setConfirmPassword("");
        setOfficeId(initialData.officeId || "");
        setDepartment(initialData.department || "");
        setAssignmentDate(
          initialData.assignmentDate ? initialData.assignmentDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
        );
        setPhone(initialData.phone || "");
        setAvatarUrl(initialData.avatarUrl || null);
        setAddress(initialData.address || "");
        setRole(initialData.role || "COORDINATOR");
      } else {
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setOfficeId("");
        setDepartment("");
        setAssignmentDate(new Date().toISOString().slice(0, 10));
        setPhone("");
        setAvatarUrl(null);
        setAddress("");
        setRole("COORDINATOR");
      }
      setShowPassword(false);
      setShowConfirmPassword(false);
      onErrorClear();
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
      const data = await res.json();
      if (res.ok) setAvatarUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  function handleEmailChange(val: string) {
    const filtered = val.replace(/[^a-zA-Z0-9_.]/g, "");
    setEmail(filtered);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onErrorClear();
    if (!name.trim()) return;
    if (!isValidUsername(email)) return;
    if (!isEdit && password.length < 8) return;
    if (password && password !== confirmPassword) return;
    await onSubmit({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      officeId: officeId || null,
      department: department.trim(),
      assignmentDate: assignmentDate.trim(),
      phone: phone.trim(),
      avatarUrl,
      address: address.trim(),
      role,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1B1B1B]">
          {isEdit ? "تعديل حساب" : "إنشاء حساب"}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">اسم صاحب الحساب *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم الكامل"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">الاسم المستخدم *</label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="إنجليزي فقط (حروف، أرقام، _ أو .)"
              className={INPUT_CLASS}
              dir="ltr"
              disabled={isEdit}
            />
            <p className="mt-1 text-xs text-[#5a5a5a]">أحرف إنجليزية وأرقام و _ و . فقط</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              كلمة المرور {isEdit ? "(اتركها فارغة للإبقاء على الحالية)" : "*"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "********" : "8 أحرف على الأقل"}
                minLength={isEdit ? undefined : 8}
                required={!isEdit}
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
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">تأكيد كلمة المرور *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={isEdit ? "أعد إدخال كلمة المرور (فارغ إذا لا تغيير)" : "أعد إدخال كلمة المرور"}
                minLength={isEdit && !password ? undefined : 8}
                required={!isEdit}
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]"
                aria-label={showConfirmPassword ? "إخفاء" : "إظهار"}
                title={showConfirmPassword ? "إخفاء" : "إظهار"}
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
              <p className="mt-1 text-xs text-red-600">كلمتا المرور غير متطابقتين</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">مكتب الارتباط</label>
            <select value={officeId} onChange={(e) => setOfficeId(e.target.value)} className={INPUT_CLASS}>
              <option value="">لا ينتمي لمكتب</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">وظيفة الحساب</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="مثال: موظف، مدير"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">تاريخ إنشاء الحساب</label>
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
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">رقم هاتف مستخدم الحساب</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">صورة شخصية</label>
            <div className="flex items-center gap-3">
              {avatarUrl && (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover border border-[#d4cfc8]"
                />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={uploading}
                className="text-sm text-[#5a5a5a] file:rounded-lg file:border file:border-[#d4cfc8] file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">عنوان السكن</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="العنوان الكامل"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">دور الحساب</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={INPUT_CLASS}>
              <option value="AUDITOR">مدقق</option>
              <option value="COORDINATOR">تنسيق ومتابعة</option>
              <option value="RECEPTION">استقبال واستعلامات</option>
              <option value="SORTING">قسم الفرز</option>
              <option value="DOCUMENTATION">قسم التوثيق</option>
            </select>
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={Boolean(
                submitting ||
                uploading ||
                !name.trim() ||
                !isValidUsername(email) ||
                (!isEdit && (password.length < 8 || password !== confirmPassword)) ||
                (isEdit && !!password && password !== confirmPassword)
              )}
              className={`${BORDER_RADIUS} flex-1 bg-[#1E6B3A] px-4 py-2.5 font-medium text-white transition hover:bg-[#175a2e] disabled:opacity-70`}
            >
              {submitting ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إنشاء الحساب"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`${BORDER_RADIUS} border border-[#d4cfc8] px-4 py-2.5 font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]`}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function isValidEmailOrUsernameDelegate(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  return emailRegex.test(v) || (usernameRegex.test(v) && v.length >= 2);
}

function DelegateModal({
  open,
  onClose,
  formations,
  initialData,
  onSubmit,
  submitting,
  error,
  onErrorClear,
}: {
  open: boolean;
  onClose: () => void;
  formations: Formation[];
  initialData?: DelegateUser | null;
  onSubmit: (data: {
    ministry: string;
    department: string;
    name: string;
    phone: string;
    address: string;
    assignmentDate: string;
    email: string;
    password: string;
    avatarUrl: string | null;
  }) => Promise<void>;
  submitting: boolean;
  error: string;
  onErrorClear: () => void;
}) {
  const [ministry, setMinistry] = useState("");
  const [department, setDepartment] = useState("");
  const [subDepts, setSubDepts] = useState<SubDept[]>([]);
  const [loadingSubDepts, setLoadingSubDepts] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [assignmentDate, setAssignmentDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const isEdit = !!initialData;
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && ministry) {
      const formation = formations.find((f) => f.name === ministry);
      if (formation) {
        setLoadingSubDepts(true);
        fetch(`/api/super-admin/ministries/subdepts-by-formation?formationId=${encodeURIComponent(formation.id)}`)
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => setSubDepts(Array.isArray(data) ? data : []))
          .catch(() => setSubDepts([]))
          .finally(() => setLoadingSubDepts(false));
      } else {
        setSubDepts([]);
      }
    } else {
      setSubDepts([]);
    }
  }, [open, ministry, formations]);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (open && justOpened) {
      if (initialData) {
        setMinistry(initialData.ministry || "");
        setDepartment(initialData.department || "");
        setName(initialData.name || "");
        setPhone(initialData.phone || "");
        setAddress(initialData.address || "");
        setAssignmentDate(initialData.assignmentDate ? initialData.assignmentDate.slice(0, 10) : "");
        setEmail(initialData.email || "");
        setPassword("");
        setConfirmPassword("");
        setAvatarUrl(initialData.avatarUrl || null);
      } else {
        setMinistry("");
        setDepartment("");
        setName("");
        setPhone("");
        setAddress("");
        setAssignmentDate("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setAvatarUrl(null);
      }
      setShowPassword(false);
      setShowConfirmPassword(false);
      onErrorClear();
    }
  }, [open, initialData, onErrorClear]);

  function handleMinistryChange(val: string) {
    setMinistry(val);
    setDepartment("");
  }

  function handleEmailChange(val: string) {
    const filtered = val.replace(/[^a-zA-Z0-9_.@]/g, "");
    setEmail(filtered);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setAvatarUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onErrorClear();
    if (!isValidEmailOrUsernameDelegate(email)) return;
    if (!isEdit && password.length < 8) return;
    if (!isEdit && password !== confirmPassword) return;
    if (isEdit && password && password !== confirmPassword) return;
    await onSubmit({
      ministry,
      department,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      assignmentDate,
      email: email.trim().toLowerCase(),
      password,
      avatarUrl,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1B1B1B]">
          {isEdit ? "تعديل مخول" : "إنشاء مخول"}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              اسم الوزارة أو الهيئة أو الجهة *
            </label>
            <select
              required
              value={ministry}
              onChange={(e) => handleMinistryChange(e.target.value)}
              className={INPUT_CLASS}
              disabled={isEdit}
            >
              <option value="">اختر الوزارة/الهيئة/الجهة</option>
              {formations.map((f) => (
                <option key={f.id} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              الدائرة الفرعية التابعة للتشكيل
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={INPUT_CLASS}
              disabled={!ministry || loadingSubDepts}
            >
              <option value="">
                {!ministry ? "اختر التشكيل أولاً" : loadingSubDepts ? "جاري التحميل..." : "اختر الدائرة الفرعية"}
              </option>
              {isEdit &&
                initialData?.department &&
                !subDepts.some((s) => s.name === initialData.department) && (
                  <option value={initialData.department}>{initialData.department}</option>
                )}
              {subDepts.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            {ministry && !loadingSubDepts && subDepts.length === 0 && (
              <p className="mt-1 text-xs text-[#5a5a5a]">لا توجد دوائر فرعية مسجلة لهذا التشكيل</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              اسم المخول الرباعي واللقب *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم الكامل واللقب"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">رقم الهاتف</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" className={INPUT_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">العنوان الكامل</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان الكامل" className={INPUT_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">تاريخ التكليف</label>
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
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">الاسم المستخدم أو البريد الإلكتروني *</label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="إنجليزي فقط (بريد أو اسم مستخدم)"
              className={INPUT_CLASS}
              dir="ltr"
              disabled={isEdit}
            />
            <p className="mt-1 text-xs text-[#5a5a5a]">أحرف إنجليزية وأرقام و _ و . و @ فقط</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              كلمة المرور {isEdit ? "(اتركها فارغة للإبقاء على الحالية)" : "*"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "********" : "8 أحرف على الأقل"}
                minLength={isEdit ? undefined : 8}
                required={!isEdit}
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
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">تأكيد كلمة المرور *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={isEdit ? "أعد إدخال كلمة المرور (فارغ إذا لا تغيير)" : "أعد إدخال كلمة المرور"}
                minLength={isEdit && !password ? undefined : 8}
                required={!isEdit}
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]"
                aria-label={showConfirmPassword ? "إخفاء" : "إظهار"}
                title={showConfirmPassword ? "إخفاء" : "إظهار"}
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
              <p className="mt-1 text-xs text-red-600">كلمتا المرور غير متطابقتين</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">الصورة الشخصية</label>
            <div className="flex items-center gap-3">
              {avatarUrl && (
                <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border border-[#d4cfc8]" />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={uploading}
                className="text-sm text-[#5a5a5a] file:rounded-lg file:border file:border-[#d4cfc8] file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={Boolean(
                submitting ||
                uploading ||
                !isValidEmailOrUsernameDelegate(email) ||
                (!isEdit && (password.length < 8 || password !== confirmPassword)) ||
                (isEdit && !!password && password !== confirmPassword)
              )}
              className={`${BORDER_RADIUS} flex-1 bg-[#1E6B3A] px-4 py-2.5 font-medium text-white transition hover:bg-[#175a2e] disabled:opacity-70`}
            >
              {submitting ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إنشاء الحساب"}
            </button>
            <button type="button" onClick={onClose} className={`${BORDER_RADIUS} border border-[#d4cfc8] px-4 py-2.5 font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]`}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailItem({ label, value, dir }: { label: string; value: string | null | undefined; dir?: "ltr" | "rtl" }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium text-[#5a5a5a]">{label}</p>
      <p className="mt-0.5 text-[#1B1B1B]" dir={dir}>{value}</p>
    </div>
  );
}

function UserViewModal({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: CreatedAccountUser | DelegateUser | null;
}) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const formatDate = (s: string | null | undefined) => {
    if (!s) return null;
    try {
      return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", numberingSystem: "arab" }).format(new Date(s));
    } catch {
      return s;
    }
  };

  const resetPasswordForm = () => {
    setShowChangePassword(false);
    setNewPassword("");
    setConfirmPassword("");
    setPwdError("");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (!user?.id) return;
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
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        resetPasswordForm();
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

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#d4cfc8] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d4cfc8] bg-gradient-to-b from-[#f6f3ed] to-white px-6 py-4">
          <h3 className="text-xl font-semibold text-[#1B1B1B]">تفاصيل الحساب</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#5a5a5a] hover:bg-[#f6f3ed] hover:text-[#1B1B1B]" aria-label="إغلاق">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/30 p-4">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-[#d4cfc8]" />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#d4cfc8]/40 text-2xl font-bold text-[#5a5a5a]">
                {(user.name || user.email || "ح").charAt(0)}
              </div>
            )}
            <div>
              <h4 className="text-lg font-bold text-[#1B1B1B]">{user.name || user.email}</h4>
              <p className="text-sm text-[#5a5a5a]" dir="ltr">{user.email}</p>
              <p className={`mt-1 text-sm font-medium ${user.enabled ? "text-[#1E6B3A]" : "text-amber-600"}`}>
                {user.enabled ? "مفعّل" : "معطّل"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="الاسم" value={user.name} />
            <DetailItem label="الاسم المستخدم" value={user.email} dir="ltr" />
            <DetailItem label="رقم الهاتف" value={user.phone} />
            <DetailItem label="العنوان" value={user.address} />
            <DetailItem label="الدور" value={ROLE_LABELS[user.role] ?? user.role} />
            {user.office && <DetailItem label="مكتب الارتباط" value={user.office.name} />}
            {"department" in user && <DetailItem label="الوظيفة" value={user.department} />}
            {"ministry" in user && <DetailItem label="الوزارة/الهيئة" value={user.ministry} />}
            {"serialNumber" in user && <DetailItem label="الرقم التسلسلي" value={user.serialNumber} />}
            {"assignmentDate" in user && <DetailItem label="تاريخ التكليف" value={formatDate(user.assignmentDate)} />}
          </div>

          <div className="rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/20 p-4">
            <h5 className="mb-3 font-semibold text-[#1B1B1B]">كلمة المرور</h5>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-[#5a5a5a]">كلمة المرور: </span>
                <span className="text-sm text-[#5a5a5a]">مخزنة بشكل مشفر ولا يمكن عرضها لأسباب أمنية</span>
                {!showChangePassword ? (
                  <button type="button" onClick={() => setShowChangePassword(true)} className="text-sm font-medium text-[#1E6B3A] hover:underline">
                    تغيير كلمة المرور
                  </button>
                ) : (
                  <button type="button" onClick={resetPasswordForm} className="text-sm font-medium text-[#5a5a5a] hover:underline">
                    إلغاء
                  </button>
                )}
              </div>
              {showChangePassword && (
                <form onSubmit={handleChangePassword} className="rounded-lg border border-[#d4cfc8]/60 bg-white p-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">كلمة المرور الجديدة</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8 أحرف على الأقل" minLength={8} className={INPUT_CLASS} />
                      <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]" aria-label={showPassword ? "إخفاء" : "إظهار"}>
                        {showPassword ? <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="أعد إدخال كلمة المرور" minLength={8} className={INPUT_CLASS} />
                      <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]" aria-label={showConfirmPassword ? "إخفاء" : "إظهار"}>
                        {showConfirmPassword ? <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                      </button>
                    </div>
                  </div>
                  {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={resetPasswordForm} className="rounded-lg border border-[#d4cfc8] px-3 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]">إلغاء</button>
                    <button type="submit" disabled={submitting || newPassword.length < 8 || newPassword !== confirmPassword} className="rounded-lg bg-[#1E6B3A] px-3 py-2 text-sm font-medium text-white hover:bg-[#175a2e] disabled:opacity-60">{submitting ? "جاري الحفظ…" : "حفظ كلمة المرور"}</button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-[#d4cfc8] px-4 py-2.5 font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]">
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<(CreatedAccountUser | DelegateUser)[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [officeManagerIds, setOfficeManagerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CreatedAccountUser | null>(null);
  const [createSubmitError, setCreateSubmitError] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [editingDelegate, setEditingDelegate] = useState<DelegateUser | null>(null);
  const [delegateSubmitError, setDelegateSubmitError] = useState("");
  const [delegateSubmitting, setDelegateSubmitting] = useState(false);
  const [deletingDelegateId, setDeletingDelegateId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<CreatedAccountUser | DelegateUser | null>(null);

  const createdAccounts = users.filter(
    (u) =>
      u.role !== "PARLIAMENT_MEMBER" &&
      !officeManagerIds.has(u.id) &&
      !(u.serialNumber && (u as DelegateUser).serialNumber?.startsWith("DEL-"))
  ) as CreatedAccountUser[];
  const delegates = users.filter((u) => (u as DelegateUser).serialNumber?.startsWith("DEL-")) as DelegateUser[];

  const totalAccounts = createdAccounts.length + delegates.length;
  const delegateCount = delegates.length;
  const enabledCount = createdAccounts.filter((u) => u.enabled).length + delegates.filter((u) => u.enabled).length;
  const disabledCount = createdAccounts.filter((u) => !u.enabled).length + delegates.filter((u) => !u.enabled).length;

  const statCards = [
    { label: "عدد الحسابات الكلية", value: totalAccounts, className: "bg-[#1E6B3A]/10 text-[#1E6B3A]" },
    { label: "عدد حسابات المخولين", value: delegateCount, className: "bg-[#1E6B3A]/10 text-[#1E6B3A]" },
    { label: "عدد الحسابات المفعلة", value: enabledCount, className: "bg-[#1E6B3A]/10 text-[#1E6B3A]" },
    { label: "عدد الحسابات المعطلة", value: disabledCount, className: "bg-amber-100 text-amber-600" },
  ];

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, officesRes, formationsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/super-admin/offices"),
        fetch("/api/super-admin/ministries/formations"),
      ]);
      if (!usersRes.ok) {
        setError("فشل تحميل المستخدمين");
        return;
      }
      const usersData = await usersRes.json();
      setUsers(usersData);
      if (officesRes.ok) {
        const officesData = await officesRes.json();
        setOffices(officesData.map((o: { id: string; name: string; managerId?: string | null }) => ({ id: o.id, name: o.name })));
        const managerIds = new Set<string>(
          officesData.filter((o: { managerId?: string | null }) => o.managerId).map((o: { managerId: string }) => o.managerId)
        );
        setOfficeManagerIds(managerIds);
      }
      if (formationsRes.ok) {
        const formationsData = await formationsRes.json();
        setFormations(formationsData);
      }
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreateAccountSubmit(data: {
    name: string;
    email: string;
    password: string;
    officeId: string | null;
    department: string;
    assignmentDate: string;
    phone: string;
    avatarUrl: string | null;
    address: string;
    role: string;
  }) {
    setCreateSubmitting(true);
    setCreateSubmitError("");
    try {
      if (editingAccount) {
        const body: Record<string, unknown> = {
          name: data.name,
          phone: data.phone,
          address: data.address,
          avatarUrl: data.avatarUrl,
          officeId: data.officeId,
          department: data.department || null,
          assignmentDate: data.assignmentDate || null,
          role: data.role,
        };
        if (data.password) body.password = data.password;
        const res = await fetch(`/api/users/${editingAccount.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const patchData = await res.json();
        if (!res.ok) {
          setCreateSubmitError(patchData.error || "فشل التعديل");
          return;
        }
        setUsers((prev) => prev.map((u) => (u.id === editingAccount.id ? { ...u, ...patchData } : u)));
        setCreateModalOpen(false);
        setEditingAccount(null);
      } else {
        const res = await fetch("/api/users/created-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.name,
            phone: data.phone,
            address: data.address,
            avatarUrl: data.avatarUrl,
            officeId: data.officeId,
            department: data.department || null,
            assignmentDate: data.assignmentDate || null,
            role: data.role,
          }),
        });
        const createData = await res.json();
        if (!res.ok) {
          setCreateSubmitError(createData.error || "فشل إنشاء الحساب");
          return;
        }
        setUsers((prev) => [createData, ...prev]);
        setCreateModalOpen(false);
      }
    } catch {
      setCreateSubmitError("خطأ في الاتصال");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleDelegateSubmit(data: {
    ministry: string;
    department: string;
    name: string;
    phone: string;
    address: string;
    assignmentDate: string;
    email: string;
    password: string;
    avatarUrl: string | null;
  }) {
    setDelegateSubmitting(true);
    setDelegateSubmitError("");
    try {
      if (editingDelegate) {
        const body: Record<string, unknown> = {
          ministry: data.ministry,
          department: data.department,
          name: data.name,
          phone: data.phone,
          address: data.address,
          assignmentDate: data.assignmentDate || null,
          avatarUrl: data.avatarUrl,
        };
        if (data.password) body.password = data.password;
        const res = await fetch(`/api/users/${editingDelegate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const patchData = await res.json();
        if (!res.ok) {
          setDelegateSubmitError(patchData.error || "فشل التعديل");
          return;
        }
        setUsers((prev) => prev.map((u) => (u.id === editingDelegate.id ? { ...u, ...patchData } : u)));
        setDelegateModalOpen(false);
        setEditingDelegate(null);
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.name,
            phone: data.phone,
            address: data.address,
            ministry: data.ministry,
            department: data.department,
            assignmentDate: data.assignmentDate || undefined,
            avatarUrl: data.avatarUrl,
            officeId: null,
            role: "USER",
          }),
        });
        const createData = await res.json();
        if (!res.ok) {
          setDelegateSubmitError(createData.error || "فشل إنشاء الحساب");
          return;
        }
        setUsers((prev) => [createData, ...prev]);
        setDelegateModalOpen(false);
      }
    } catch {
      setDelegateSubmitError("خطأ في الاتصال");
    } finally {
      setDelegateSubmitting(false);
    }
  }

  async function handleDeleteDelegate(d: DelegateUser) {
    if (!confirm(`هل تريد حذف المخول "${d.name || d.email}"؟`)) return;
    setDeletingDelegateId(d.id);
    try {
      const res = await fetch(`/api/users/${d.id}`, { method: "DELETE" });
      if (!res.ok) return;
      setUsers((prev) => prev.filter((u) => u.id !== d.id));
    } finally {
      setDeletingDelegateId(null);
    }
  }

  async function toggleEnabled(user: User) {
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !user.enabled }) });
      if (!res.ok) return;
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, enabled: !u.enabled } : u)));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDeleteAccount(acc: CreatedAccountUser) {
    if (!confirm(`هل تريد حذف الحساب "${acc.name || acc.email}"؟`)) return;
    setDeletingId(acc.id);
    try {
      const res = await fetch(`/api/users/${acc.id}`, { method: "DELETE" });
      if (!res.ok) return;
      setUsers((prev) => prev.filter((u) => u.id !== acc.id));
    } finally {
      setDeletingId(null);
    }
  }

  function openEditAccountModal(acc: CreatedAccountUser) {
    setEditingAccount(acc);
    setCreateModalOpen(true);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[#1B1B1B]">إدارة المستخدمين</h1>
        <p className="mt-1 text-sm text-[#5a5a5a]">
          إنشاء وإدارة حسابات الإداريين وحسابات المخولين. لا يظهر حساب الإدارة العليا هنا.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col rounded-2xl border border-[#d4cfc8] bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.className}`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-[#5a5a5a]">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-[#1B1B1B]">{loading ? "—" : card.value}</p>
          </div>
        ))}
      </section>

      <CreateAccountModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingAccount(null);
        }}
        offices={offices}
        initialData={editingAccount}
        onSubmit={handleCreateAccountSubmit}
        submitting={createSubmitting}
        error={createSubmitError}
        onErrorClear={() => setCreateSubmitError("")}
      />

      {/* حسابات الإداريين */}
      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1B1B1B]">حسابات الإداريين</h2>
            <p className="mt-1 text-sm text-[#5a5a5a]">إنشاء وإدارة الحسابات من هذه الصفحة (لا تشمل مدراء المكاتب من صفحة المكاتب).</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingAccount(null);
              setCreateModalOpen(true);
            }}
            className={`${BORDER_RADIUS} bg-[#1E6B3A] px-4 py-2.5 font-medium text-white transition hover:bg-[#175a2e]`}
          >
            إنشاء حساب
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-[#5a5a5a]">جاري التحميل...</p>
        ) : createdAccounts.length === 0 ? (
          <p className="mt-4 text-sm text-[#5a5a5a]">لا توجد حسابات منشأة مسجلة.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[800px] text-right">
              <thead>
                <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                  <th className="py-3 pr-2">اسم صاحب الحساب</th>
                  <th className="py-3 pr-2">الاسم المستخدم</th>
                  <th className="py-3 pr-2">مكتب الارتباط</th>
                  <th className="py-3 pr-2">وظيفة الحساب</th>
                  <th className="py-3 pr-2">تاريخ الإنشاء</th>
                  <th className="py-3 pr-2">رقم الهاتف</th>
                  <th className="py-3 pr-2">الصورة</th>
                  <th className="py-3 pr-2">الحالة</th>
                  <th className="py-3 pl-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {createdAccounts.map((a) => (
                  <tr key={a.id} className="border-b border-[#d4cfc8]/80">
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{a.name || "—"}</td>
                    <td className="py-3 pr-2 text-[#1B1B1B]" dir="ltr">{a.email}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{a.office?.name || "—"}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{a.department || "—"}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">
                      {a.assignmentDate
                        ? new Date(a.assignmentDate).toLocaleDateString("ar-IQ")
                        : a.createdAt
                        ? new Date(a.createdAt).toLocaleDateString("ar-IQ")
                        : "—"}
                    </td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{a.phone || "—"}</td>
                    <td className="py-3 pr-2">
                      {a.avatarUrl ? (
                        <img src={a.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover border border-[#d4cfc8]" />
                      ) : (
                        <span className="text-[#5a5a5a]">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-2">
                      <span className={a.enabled ? "text-[#1E6B3A] font-medium" : "text-amber-600 font-medium"}>{a.enabled ? "مفعّل" : "معطّل"}</span>
                    </td>
                    <td className="py-3 pl-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingUser(a)}
                          className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed]"
                        >
                          عرض
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditAccountModal(a)}
                          className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed]"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEnabled(a)}
                          disabled={togglingId === a.id}
                          className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed] disabled:opacity-60"
                        >
                          {togglingId === a.id ? "…" : a.enabled ? "تعطيل" : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(a)}
                          disabled={deletingId === a.id}
                          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === a.id ? "…" : "حذف"}
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

      <DelegateModal
        open={delegateModalOpen}
        onClose={() => { setDelegateModalOpen(false); setEditingDelegate(null); }}
        formations={formations}
        initialData={editingDelegate}
        onSubmit={handleDelegateSubmit}
        submitting={delegateSubmitting}
        error={delegateSubmitError}
        onErrorClear={() => setDelegateSubmitError("")}
      />

      {/* جدول حسابات المخولين */}
      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1B1B1B]">حسابات المخولين</h2>
            <p className="mt-1 text-sm text-[#5a5a5a]">إنشاء وإدارة حسابات المخولين المسؤولين عن تنفيذ المعاملات.</p>
          </div>
          <button
            type="button"
            onClick={() => { setEditingDelegate(null); setDelegateModalOpen(true); }}
            className={`${BORDER_RADIUS} bg-[#1E6B3A] px-4 py-2.5 font-medium text-white transition hover:bg-[#175a2e]`}
          >
            إنشاء مخول
          </button>
        </div>
        {loading ? (
          <p className="mt-4 text-[#5a5a5a]">جاري التحميل...</p>
        ) : delegates.length === 0 ? (
          <p className="mt-4 text-sm text-[#5a5a5a]">لا يوجد مخولون مسجلون.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-right">
              <thead>
                <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                  <th className="py-3 pr-2">الرقم التسلسلي</th>
                  <th className="py-3 pr-2">الوزارة/الهيئة</th>
                  <th className="py-3 pr-2">الاسم</th>
                  <th className="py-3 pr-2">الهاتف</th>
                  <th className="py-3 pr-2">الاسم المستخدم</th>
                  <th className="py-3 pr-2">تاريخ التكليف</th>
                  <th className="py-3 pr-2">الصورة</th>
                  <th className="py-3 pr-2">الحالة</th>
                  <th className="py-3 pl-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {delegates.map((d) => (
                  <tr key={d.id} className="border-b border-[#d4cfc8]/80">
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{d.serialNumber || "—"}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{d.ministry || "—"}</td>
                    <td className="py-3 pr-2 text-[#1B1B1B]">{d.name || d.email}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{d.phone || "—"}</td>
                    <td className="py-3 pr-2 text-[#1B1B1B]" dir="ltr">{d.email}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">
                      {d.assignmentDate ? new Date(d.assignmentDate).toLocaleDateString("ar-IQ") : "—"}
                    </td>
                    <td className="py-3 pr-2">
                      {d.avatarUrl ? (
                        <img src={d.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover border border-[#d4cfc8]" />
                      ) : (
                        <span className="text-[#5a5a5a]">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-2">
                      <span className={d.enabled ? "text-[#1E6B3A] font-medium" : "text-amber-600 font-medium"}>{d.enabled ? "مفعّل" : "معطّل"}</span>
                    </td>
                    <td className="py-3 pl-2">
                      <div className="flex flex-wrap gap-1">
                        <button type="button" onClick={() => setViewingUser(d)} className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed]">عرض</button>
                        <button type="button" onClick={() => { setEditingDelegate(d); setDelegateModalOpen(true); }} className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed]">تعديل</button>
                        <button type="button" onClick={() => toggleEnabled(d)} disabled={togglingId === d.id} className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed] disabled:opacity-60">{togglingId === d.id ? "…" : d.enabled ? "تعطيل" : "تفعيل"}</button>
                        <button type="button" onClick={() => handleDeleteDelegate(d)} disabled={deletingDelegateId === d.id} className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">{deletingDelegateId === d.id ? "…" : "حذف"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <UserViewModal open={!!viewingUser} onClose={() => setViewingUser(null)} user={viewingUser} />
    </div>
  );
}
