"use client";

import { useState, useEffect, useCallback } from "react";

type SuperAdminRow = {
  id: string;
  email: string;
  name: string | null;
  enabled: boolean;
  createdAt: string;
};

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
          {listLoading ? (
            <p className="mt-4 text-[#5a5a5a]">جاري التحميل...</p>
          ) : list.length === 0 ? (
            <p className="mt-4 text-[#5a5a5a]">لا يوجد سوبر أدمن بعد.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {list.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e8dfcf] bg-[#f9f7f3] px-4 py-3"
                >
                  <span className="font-medium text-[#1B1B1B]">{u.email}</span>
                  <span className="text-sm text-[#5a5a5a]">{u.name || "—"}</span>
                  <span className="text-xs text-[#5a5a5a]">
                    {u.enabled ? "مفعّل" : "معطّل"} · {new Date(u.createdAt).toLocaleDateString("ar-IQ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
}
