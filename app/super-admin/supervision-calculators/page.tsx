"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { broadcastDataUpdate } from "@/lib/broadcast-data-update";
import Link from "next/link";

type SupervisionAccount = {
  id: string;
  name: string | null;
  email: string;
  department: string | null;
  enabled: boolean;
  createdAt: string;
};

const BORDER_RADIUS = "rounded-xl";
const INPUT_CLASS =
  "w-full rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25";

function isValidUsername(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  return emailRegex.test(v) || (usernameRegex.test(v) && v.length >= 2);
}

function EditModal({
  open,
  onClose,
  account,
  onSubmit,
  submitting,
  error,
  onErrorClear,
}: {
  open: boolean;
  onClose: () => void;
  account: SupervisionAccount | null;
  onSubmit: (data: { name: string; username: string; password: string; confirmPassword: string; description: string }) => Promise<void>;
  submitting: boolean;
  error: string;
  onErrorClear: () => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [description, setDescription] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (open && justOpened && account) {
      setName(account.name || "");
      setUsername(account.email || "");
      setPassword("");
      setConfirmPassword("");
      setDescription(account.department || "");
      onErrorClear();
    }
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [open, account, onErrorClear]);

  if (!open) return null;

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUsername(e.target.value.replace(/[^a-zA-Z0-9_.@]/g, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onErrorClear();
    await onSubmit({ name, username, password, confirmPassword, description });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1B1B1B]">تعديل حساب الإشراف والمراقبة</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">اسم المشرف *</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" className={INPUT_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">الاسم المستخدم *</label>
            <input
              type="text"
              required
              value={username}
              onChange={handleUsernameChange}
              placeholder="بريد أو اسم مستخدم (إنجليزي فقط)"
              className={INPUT_CLASS}
              dir="ltr"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">كلمة المرور (اتركها فارغة للإبقاء على الحالية)</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                minLength={password ? 8 : undefined}
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]"
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
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">التأكد من كلمة المرور</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={password ? "أعد إدخال كلمة المرور" : "—"}
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a] hover:text-[#1B1B1B]"
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
            {password && confirmPassword && password !== confirmPassword && <p className="mt-1 text-xs text-red-600">كلمتا المرور غير متطابقتين</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">وصف المشرف</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف المشرف" rows={3} className={INPUT_CLASS} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting || !name.trim() || !isValidUsername(username) || (!!password && (password.length < 8 || password !== confirmPassword))}
              className={`${BORDER_RADIUS} flex-1 bg-[#1E6B3A] px-4 py-2.5 font-medium text-white hover:bg-[#175a2e] disabled:opacity-70`}
            >
              {submitting ? "جاري الحفظ..." : "حفظ"}
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

function ViewModal({ open, onClose, account }: { open: boolean; onClose: () => void; account: SupervisionAccount | null }) {
  if (!open || !account) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative max-w-md w-full rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1B1B1B]">عرض حساب الإشراف والمراقبة</h3>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-sm text-[#5a5a5a]">اسم المشرف</dt>
            <dd className="font-medium text-[#1B1B1B]">{account.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-[#5a5a5a]">الاسم المستخدم</dt>
            <dd className="font-medium text-[#1B1B1B]" dir="ltr">{account.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-[#5a5a5a]">وصف المشرف</dt>
            <dd className="text-[#1B1B1B]">{account.department || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-[#5a5a5a]">الحالة</dt>
            <dd>
              <span className={account.enabled ? "text-[#1E6B3A] font-medium" : "text-amber-600 font-medium"}>
                {account.enabled ? "مفعّل" : "معطّل"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[#5a5a5a]">تاريخ الإنشاء</dt>
            <dd className="text-[#1B1B1B]">{new Date(account.createdAt).toLocaleDateString("ar-IQ", { dateStyle: "medium", numberingSystem: "arab" })}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onClose}
          className={`${BORDER_RADIUS} mt-6 w-full border border-[#d4cfc8] px-4 py-2.5 font-medium text-[#1B1B1B] hover:bg-[#f6f3ed]`}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}

export default function SuperAdminSupervisionCalculatorsPage() {
  const [accounts, setAccounts] = useState<SupervisionAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<SupervisionAccount | null>(null);
  const [viewModal, setViewModal] = useState<SupervisionAccount | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/supervision-accounts");
      const data = await res.json().catch(() => []);
      setAccounts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useAutoRefresh(fetchAccounts);

  async function handleEditSubmit(data: {
    name: string;
    username: string;
    password: string;
    confirmPassword: string;
    description: string;
  }) {
    if (!editModal) return;
    setEditSubmitting(true);
    setEditError("");
    try {
      const res = await fetch(`/api/super-admin/supervision-accounts/${editModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          username: data.username.trim().toLowerCase(),
          description: data.description.trim() || null,
          password: data.password || undefined,
          confirmPassword: data.confirmPassword || undefined,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(typeof result.error === "string" ? result.error : "حدث خطأ");
        return;
      }
      setEditModal(null);
      fetchAccounts();
      broadcastDataUpdate();
    } finally {
      setEditSubmitting(false);
    }
  }

  async function toggleEnabled(a: SupervisionAccount) {
    setTogglingId(a.id);
    try {
      const res = await fetch(`/api/super-admin/supervision-accounts/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !a.enabled }),
      });
      if (res.ok) {
        fetchAccounts();
        broadcastDataUpdate();
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(a: SupervisionAccount) {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع عن هذه العملية.")) return;
    setDeletingId(a.id);
    try {
      const res = await fetch(`/api/super-admin/supervision-accounts/${a.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAccounts();
        broadcastDataUpdate();
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-w-0 w-full max-w-full space-y-4 sm:space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold leading-tight text-[#1B1B1B] sm:text-2xl sm:leading-normal">حاسبات الإشراف والمراقبة</h1>
        <Link
          href="/super-admin/supervision-calculators/add"
          className={`${BORDER_RADIUS} inline-flex items-center gap-2 bg-[#1E6B3A] px-4 py-2.5 font-medium text-white transition hover:bg-[#175a2e]`}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إضافة حساب
        </Link>
      </div>

      <div className="rounded-2xl border border-[#d4cfc8] bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#1E6B3A]/20 bg-[#1E6B3A]/5">
            <svg className="h-6 w-6 text-[#1E6B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#5a5a5a]">عدد حسابات المشرفين</p>
            <p className="text-2xl font-bold text-[#1B1B1B]">{loading ? "—" : accounts.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm sm:p-6">
        {loading ? (
          <p className="py-8 text-center text-[#5a5a5a]">جاري التحميل...</p>
        ) : accounts.length === 0 ? (
          <p className="py-8 text-center text-[#5a5a5a]">لا توجد حسابات مسجلة. اضغط على &quot;إضافة حساب&quot; لإنشاء حساب جديد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right">
              <thead>
                <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                  <th className="py-3 pr-2">م</th>
                  <th className="py-3 pr-2">اسم المشرف</th>
                  <th className="py-3 pr-2">الاسم المستخدم</th>
                  <th className="py-3 pr-2">وصف المشرف</th>
                  <th className="py-3 pr-2">تاريخ الإنشاء</th>
                  <th className="py-3 pr-2">الحالة</th>
                  <th className="py-3 pl-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a, idx) => (
                  <tr key={a.id} className="border-b border-[#d4cfc8]/80">
                    <td className="py-3 pr-2 text-[#5a5a5a]">{idx + 1}</td>
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{a.name || "—"}</td>
                    <td className="py-3 pr-2 text-[#1B1B1B]" dir="ltr">{a.email}</td>
                    <td className="py-3 pr-2 max-w-[200px] truncate text-[#5a5a5a]" title={a.department || undefined}>{a.department || "—"}</td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{new Date(a.createdAt).toLocaleDateString("ar-IQ", { dateStyle: "short", numberingSystem: "arab" })}</td>
                    <td className="py-3 pr-2">
                      <span className={a.enabled ? "text-[#1E6B3A] font-medium" : "text-amber-600 font-medium"}>{a.enabled ? "مفعّل" : "معطّل"}</span>
                    </td>
                    <td className="py-3 pl-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setViewModal(a)}
                          className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed]"
                        >
                          عرض
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditModal(a)}
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
                          onClick={() => handleDelete(a)}
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
      </div>

      <EditModal
        open={!!editModal}
        onClose={() => { setEditModal(null); setEditError(""); }}
        account={editModal}
        onSubmit={handleEditSubmit}
        submitting={editSubmitting}
        error={editError}
        onErrorClear={() => setEditError("")}
      />
      <ViewModal open={!!viewModal} onClose={() => setViewModal(null)} account={viewModal} />
    </div>
  );
}
