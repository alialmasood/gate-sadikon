"use client";

import { useEffect, useState, useCallback } from "react";

type ParliamentMember = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  enabled: boolean;
  createdAt: string;
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

function ParliamentMemberModal({
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
  initialData?: ParliamentMember | null;
  onSubmit: (data: {
    name: string;
    phone: string;
    email: string;
    password: string;
  }) => Promise<void>;
  submitting: boolean;
  error: string;
  onErrorClear: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isEdit = !!initialData;

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name || "");
        setPhone(initialData.phone || "");
        setEmail(initialData.email || "");
        setPassword("");
        setConfirmPassword("");
      } else {
        setName("");
        setPhone("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
      setShowPassword(false);
      setShowConfirmPassword(false);
      onErrorClear();
    }
  }, [open, initialData, onErrorClear]);

  function handleEmailChange(val: string) {
    const filtered = val.replace(/[^a-zA-Z0-9_.@]/g, "");
    setEmail(filtered);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onErrorClear();
    if (!name.trim()) return;
    if (!isValidEmailOrUsername(email)) return;
    if (!isEdit && password.length < 8) return;
    if (!isEdit && password !== confirmPassword) return;
    if (isEdit && password && password !== confirmPassword) return;
    await onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase(), password });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1B1B1B]">
          {isEdit ? "تعديل حساب برلماني" : "إضافة حساب برلماني"}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">اسم عضو مجلس النواب *</label>
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
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">رقم الهاتف</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
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
              placeholder="بريد إلكتروني أو اسم مستخدم (إنجليزي فقط)"
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
                placeholder={isEdit ? "فارغ إذا لا تغيير" : "أعد إدخال كلمة المرور"}
                minLength={isEdit && !password ? undefined : 8}
                required={!isEdit}
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
            {password && confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-600">كلمتا المرور غير متطابقتين</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={Boolean(
                submitting ||
                !name.trim() ||
                !isValidEmailOrUsername(email) ||
                (!isEdit && (password.length < 8 || password !== confirmPassword)) ||
                (isEdit && !!password && password !== confirmPassword)
              )}
              className={`${BORDER_RADIUS} flex-1 bg-[#1E6B3A] px-4 py-2.5 font-medium text-white transition hover:bg-[#175a2e] disabled:opacity-70`}
            >
              {submitting ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة"}
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

export default function ParliamentMembersPage() {
  const [members, setMembers] = useState<ParliamentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ParliamentMember | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/parliament-members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleSubmit(data: {
    name: string;
    phone: string;
    email: string;
    password: string;
  }) {
    setSubmitting(true);
    setSubmitError("");
    try {
      if (editingMember) {
        const body: Record<string, unknown> = { name: data.name, phone: data.phone };
        if (data.password) body.password = data.password;
        const res = await fetch(`/api/super-admin/parliament-members/${editingMember.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const patchData = await res.json();
        if (!res.ok) {
          setSubmitError(patchData.error || "فشل التعديل");
          return;
        }
        setMembers((prev) => prev.map((m) => (m.id === editingMember.id ? patchData : m)));
        setModalOpen(false);
        setEditingMember(null);
      } else {
        const res = await fetch("/api/super-admin/parliament-members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            phone: data.phone,
            email: data.email,
            password: data.password,
          }),
        });
        const createData = await res.json();
        if (!res.ok) {
          setSubmitError(createData.error || "فشل الإضافة");
          return;
        }
        setMembers((prev) => [createData, ...prev]);
        setModalOpen(false);
      }
    } catch {
      setSubmitError("خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(m: ParliamentMember) {
    if (!confirm(`هل تريد حذف الحساب البرلماني "${m.name || m.email}"؟`)) return;
    setDeletingId(m.id);
    try {
      const res = await fetch(`/api/super-admin/parliament-members/${m.id}`, { method: "DELETE" });
      if (res.ok) setMembers((prev) => prev.filter((x) => x.id !== m.id));
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleEnabled(m: ParliamentMember) {
    setTogglingId(m.id);
    try {
      const res = await fetch(`/api/super-admin/parliament-members/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !m.enabled }),
      });
      if (res.ok) {
        const patchData = await res.json();
        setMembers((prev) => prev.map((x) => (x.id === m.id ? patchData : x)));
      }
    } finally {
      setTogglingId(null);
    }
  }

  const totalCount = members.length;
  const enabledCount = members.filter((m) => m.enabled).length;
  const disabledCount = members.filter((m) => !m.enabled).length;

  const statCards = [
    { label: "عدد الأعضاء", value: totalCount, className: "bg-[#1E6B3A]/10 text-[#1E6B3A]" },
    { label: "المفعلين", value: enabledCount, className: "bg-[#1E6B3A]/10 text-[#1E6B3A]" },
    { label: "المعطلين", value: disabledCount, className: "bg-amber-100 text-amber-600" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">شؤون أعضاء مجلس النواب</h1>
        <button
          type="button"
          onClick={() => {
            setEditingMember(null);
            setModalOpen(true);
          }}
          className={`${BORDER_RADIUS} bg-[#1E6B3A] px-4 py-2.5 font-medium text-white transition hover:bg-[#175a2e]`}
        >
          إضافة حساب
        </button>
      </div>

      {/* إحصائيات */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* قائمة أعضاء */}
      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1B1B]">قائمة أعضاء</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">حسابات أعضاء مجلس النواب المرتبطين بالكتلة.</p>
        {loading ? (
          <p className="mt-4 py-8 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : members.length === 0 ? (
          <p className="mt-4 py-8 text-center text-[#5a5a5a]">لا توجد حسابات برلمانية مسجلة.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-right">
              <thead>
                <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                  <th className="py-3 pr-2">اسم عضو مجلس النواب</th>
                  <th className="py-3 pr-2">رقم الهاتف</th>
                  <th className="py-3 pr-2">الاسم المستخدم</th>
                  <th className="py-3 pr-2">الحالة</th>
                  <th className="py-3 pl-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-[#d4cfc8]/80">
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{m.name || "—"}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{m.phone || "—"}</td>
                    <td className="py-3 pr-2 text-[#1B1B1B]" dir="ltr">{m.email}</td>
                    <td className="py-3 pr-2">
                      <span className={m.enabled ? "text-[#1E6B3A] font-medium" : "text-amber-600 font-medium"}>
                        {m.enabled ? "مفعّل" : "معطّل"}
                      </span>
                    </td>
                    <td className="py-3 pl-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMember(m);
                            setModalOpen(true);
                          }}
                          className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed]"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEnabled(m)}
                          disabled={togglingId === m.id}
                          className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed] disabled:opacity-60"
                        >
                          {togglingId === m.id ? "…" : m.enabled ? "تعطيل" : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m)}
                          disabled={deletingId === m.id}
                          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === m.id ? "…" : "حذف"}
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

      {/* توجيهات */}
      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1B1B1B]">توجيهات</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">التوجيهات والتعليمات الموجهة لأعضاء مجلس النواب.</p>
        <div className="mt-4 rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/50 p-6 text-center">
          <p className="text-[#5a5a5a]">قسم التوجيهات — قيد التطوير</p>
        </div>
      </article>

      <ParliamentMemberModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingMember(null);
        }}
        initialData={editingMember}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={submitError}
        onErrorClear={() => setSubmitError("")}
      />
    </div>
  );
}
