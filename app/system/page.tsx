"use client";

import { useState, useEffect, useCallback } from "react";

type SuperAdminRow = {
  id: string;
  email: string;
  name: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
};

const INPUT_CLASS =
  "w-full rounded-xl border border-[#d9cbb4] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25";

function formatDate(s: string) {
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

export default function SystemPage() {
  const [key, setKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<SuperAdminRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewingUser, setViewingUser] = useState<SuperAdminRow | null>(null);
  const [passwordUser, setPasswordUser] = useState<SuperAdminRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const verifyKey = useCallback(async (k: string) => {
    if (!k.trim()) return false;
    const res = await fetch(`/api/system/verify?key=${encodeURIComponent(k.trim())}`);
    return res.ok;
  }, []);

  const loadList = useCallback(async () => {
    if (!key) return;
    setListLoading(true);
    try {
      const res = await fetch("/api/system/super-admins", {
        headers: { "X-System-Key": key },
      });
      if (res.ok) {
        const data = await res.json();
        setList(data);
      }
    } finally {
      setListLoading(false);
    }
  }, [key]);

  useEffect(() => {
    if (!key) {
      setVerified(null);
      return;
    }
    let cancelled = false;
    setVerified(null);
    setLoading(true);
    verifyKey(key).then((ok) => {
      if (!cancelled) {
        setVerified(ok);
        if (ok) loadList();
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [key, verifyKey, loadList]);

  async function handleKeySubmit(e: React.FormEvent) {
    e.preventDefault();
    const k = keyInput.trim();
    if (!k) return;
    setLoading(true);
    setSubmitError("");
    const ok = await verifyKey(k);
    setLoading(false);
    if (ok) {
      setKey(k);
      setVerified(true);
    } else {
      setSubmitError("مفتاح غير صحيح. ضع في ملف البيئة SYSTEM_SETUP_SECRET=123456789 (أو المفتاح الذي اخترته).");
    }
  }

  async function handleToggleEnabled(user: SuperAdminRow) {
    const action = user.enabled ? "تعطيل" : "تفعيل";
    if (!confirm(`هل تريد ${action} حساب "${user.name || user.email}"؟`)) return;
    setActionError("");
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/system/super-admins/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-System-Key": key,
        },
        body: JSON.stringify({ enabled: !user.enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || `فشل ${action} الحساب`);
        return;
      }
      setList((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...data } : u)));
    } catch {
      setActionError("خطأ في الاتصال");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(user: SuperAdminRow) {
    if (!confirm(`هل تريد حذف حساب "${user.name || user.email}" نهائياً؟ لا يمكن التراجع.`)) return;
    setActionError("");
    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/system/super-admins/${user.id}`, {
        method: "DELETE",
        headers: { "X-System-Key": key },
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "فشل حذف الحساب");
        return;
      }
      setList((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      setActionError("خطأ في الاتصال");
    } finally {
      setDeletingId(null);
    }
  }

  function openPasswordModal(user: SuperAdminRow) {
    setPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordUser) return;
    setPasswordError("");
    if (newPassword.length < 8) {
      setPasswordError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("كلمة المرور غير متطابقة");
      return;
    }
    setPasswordSubmitting(true);
    try {
      const res = await fetch(`/api/system/super-admins/${passwordUser.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-System-Key": key,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "فشل تغيير كلمة المرور");
        return;
      }
      setPasswordUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("خطأ في الاتصال");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/system/super-admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-System-Key": key,
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "فشل إنشاء الحساب");
        return;
      }
      setList((prev) => [{ ...data, role: "SUPER_ADMIN" }, ...prev]);
      setEmail("");
      setPassword("");
      setName("");
    } catch {
      setSubmitError("خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  }

  if (verified === null && !key) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6F8] p-4" dir="rtl">
        <div className="w-full max-w-md rounded-2xl border border-[#e8dfcf] bg-white p-8 shadow-lg">
          <h1 className="text-xl font-bold text-[#1B1B1B]">إدارة المنصة</h1>
          <p className="mt-2 text-sm text-[#5a5a5a]">
            إنشاء حسابات الإدارة العليا (سوبر أدمن) فقط. أدخل المفتاح ثم أنشئ الحسابات.
          </p>
          <p className="mt-1 text-xs text-[#5a5a5a]">
            المفتاح = قيمة <code className="rounded bg-[#e8dfcf] px-1">SYSTEM_SETUP_SECRET</code> في ملف البيئة (.env أو .env.local). للتطوير يمكن استخدام 123456789.
          </p>
          <form onSubmit={handleKeySubmit} className="mt-6">
            <label className="mb-2 block text-sm font-medium text-[#1B1B1B]">
              مفتاح إدارة النظام
            </label>
            <input
              type="password"
              autoComplete="off"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="مثال: 123456789"
              className="w-full rounded-xl border border-[#d9cbb4] bg-[#f6f3ed] px-4 py-3 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25"
            />
            {submitError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {submitError}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-[#B08D57] py-3 font-medium text-white hover:bg-[#9C7B49] disabled:opacity-70"
            >
              {loading ? "جاري التحقق..." : "دخول"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (verified === false || (verified === null && key)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6F8] p-4" dir="rtl">
        <div className="w-full max-w-md rounded-2xl border border-[#e8dfcf] bg-white p-8 shadow-lg">
          {loading ? (
            <p className="text-[#5a5a5a]">جاري التحقق...</p>
          ) : (
            <>
              <p className="text-[#1B1B1B] font-medium">غير مصرح.</p>
              <p className="mt-2 text-sm text-[#5a5a5a]">
                المفتاح غير صحيح أو لم يتم ضبط <code className="rounded bg-[#e8dfcf] px-1">SYSTEM_SETUP_SECRET</code> في البيئة على السيرفر (8 أحرف على الأقل). للتطوير: ضع في .env.local السطر <code className="rounded bg-[#e8dfcf] px-1">SYSTEM_SETUP_SECRET=123456789</code>
              </p>
              <button
                type="button"
                onClick={() => setKey("")}
                className="mt-6 rounded-xl border border-[#d9cbb4] px-4 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
              >
                إعادة إدخال المفتاح
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] p-4 md:p-6" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-[#1B1B1B]">إنشاء حسابات الإدارة العليا</h1>
          <button
            type="button"
            onClick={() => setKey("")}
            className="rounded-xl border border-[#d9cbb4] bg-white px-4 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
          >
            إنهاء الجلسة
          </button>
        </div>
        <p className="mt-2 text-sm text-[#5a5a5a]">
          أنت تدير المنصة. أنشئ هنا حسابات السوبر أدمن فقط وأعطِ بيانات الدخول لهم. إنشاء الأدمن والمستخدمين يتم من لوحة السوبر أدمن.
        </p>

        <article className="mt-6 rounded-2xl border border-[#e8dfcf] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1B1B1B]">إنشاء سوبر أدمن جديد</h2>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-xl border border-[#d9cbb4] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">كلمة المرور</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                className="w-full rounded-xl border border-[#d9cbb4] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">الاسم (اختياري)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم المعروض"
                className="w-full rounded-xl border border-[#d9cbb4] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25"
              />
            </div>
            <div className="sm:col-span-2">
              {submitError && (
                <p className="mb-2 text-sm text-red-600" role="alert">
                  {submitError}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[#B08D57] px-6 py-2.5 font-medium text-white hover:bg-[#9C7B49] disabled:opacity-70"
              >
                {submitting ? "جاري الإنشاء..." : "إنشاء سوبر أدمن"}
              </button>
            </div>
          </form>
        </article>

        <article className="mt-6 rounded-2xl border border-[#e8dfcf] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1B1B1B]">حسابات الإدارة العليا الحالية</h2>
          {actionError && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {actionError}
            </p>
          )}
          {listLoading ? (
            <p className="mt-4 text-[#5a5a5a]">جاري التحميل...</p>
          ) : list.length === 0 ? (
            <p className="mt-4 text-[#5a5a5a]">لا يوجد سوبر أدمن بعد.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[#e8dfcf] text-right text-[#5a5a5a]">
                    <th className="py-2 pr-2 font-medium">البريد الإلكتروني</th>
                    <th className="py-2 pr-2 font-medium">الاسم</th>
                    <th className="py-2 pr-2 font-medium">الحالة</th>
                    <th className="py-2 pr-2 font-medium">تاريخ الإنشاء</th>
                    <th className="py-2 pl-2 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((u) => (
                    <tr key={u.id} className="border-b border-[#e8dfcf]/80">
                      <td className="py-3 pr-2 font-medium text-[#1B1B1B]" dir="ltr">
                        {u.email}
                      </td>
                      <td className="py-3 pr-2 text-[#5a5a5a]">{u.name || "—"}</td>
                      <td className="py-3 pr-2">
                        <span
                          className={
                            u.enabled ? "font-medium text-[#1E6B3A]" : "font-medium text-amber-600"
                          }
                        >
                          {u.enabled ? "مفعّل" : "معطّل"}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-[#5a5a5a]">
                        {new Date(u.createdAt).toLocaleDateString("ar-IQ")}
                      </td>
                      <td className="py-3 pl-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingUser(u)}
                            className="rounded-lg border border-[#d9cbb4] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed]"
                          >
                            عرض
                          </button>
                          <button
                            type="button"
                            onClick={() => openPasswordModal(u)}
                            className="rounded-lg border border-[#d9cbb4] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed]"
                          >
                            تغيير كلمة السر
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleEnabled(u)}
                            disabled={togglingId === u.id}
                            className="rounded-lg border border-[#d9cbb4] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed] disabled:opacity-60"
                          >
                            {togglingId === u.id ? "…" : u.enabled ? "تعطيل" : "تفعيل"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            disabled={deletingId === u.id}
                            className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingId === u.id ? "…" : "حذف"}
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
      </div>

      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setViewingUser(null)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[#e8dfcf] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">تفاصيل الحساب</h3>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="rounded-lg p-2 text-[#5a5a5a] hover:bg-[#f6f3ed]"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-[#5a5a5a]">البريد الإلكتروني</p>
                <p className="mt-0.5 text-[#1B1B1B]" dir="ltr">
                  {viewingUser.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5a5a5a]">الاسم</p>
                <p className="mt-0.5 text-[#1B1B1B]">{viewingUser.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5a5a5a]">الحالة</p>
                <p
                  className={`mt-0.5 font-medium ${viewingUser.enabled ? "text-[#1E6B3A]" : "text-amber-600"}`}
                >
                  {viewingUser.enabled ? "مفعّل" : "معطّل"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5a5a5a]">تاريخ الإنشاء</p>
                <p className="mt-0.5 text-[#1B1B1B]">{formatDate(viewingUser.createdAt)}</p>
              </div>
              {viewingUser.updatedAt && (
                <div>
                  <p className="text-xs font-medium text-[#5a5a5a]">آخر تحديث</p>
                  <p className="mt-0.5 text-[#1B1B1B]">{formatDate(viewingUser.updatedAt)}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-[#5a5a5a]">كلمة المرور</p>
                <p className="mt-0.5 text-sm text-[#5a5a5a]">
                  مخزنة بشكل مشفر ولا يمكن عرضها لأسباب أمنية
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="rounded-xl border border-[#d9cbb4] px-4 py-2 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setPasswordUser(null)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[#e8dfcf] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-[#1B1B1B]">تغيير كلمة المرور</h3>
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                className="rounded-lg p-2 text-[#5a5a5a] hover:bg-[#f6f3ed]"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-[#5a5a5a]">
              الحساب: <span className="font-medium text-[#1B1B1B]">{passwordUser.email}</span>
            </p>
            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  className={INPUT_CLASS}
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-600" role="alert">
                  {passwordError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    passwordSubmitting ||
                    newPassword.length < 8 ||
                    newPassword !== confirmPassword
                  }
                  className="rounded-xl bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B49] disabled:opacity-70"
                >
                  {passwordSubmitting ? "جاري الحفظ..." : "حفظ كلمة المرور"}
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordUser(null)}
                  className="rounded-xl border border-[#d9cbb4] px-4 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
