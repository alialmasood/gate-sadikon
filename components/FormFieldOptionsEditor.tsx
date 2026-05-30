"use client";

import { useCallback, useEffect, useState } from "react";

type Option = { id?: string; value: string; label: string };

const INPUT_CLASS =
  "w-full rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25";

export function FormFieldOptionsEditor({
  title,
  description,
  apiBase,
  showValueCode = true,
  valueCodeHint,
}: {
  title: string;
  description: string;
  apiBase: string;
  showValueCode?: boolean;
  valueCodeHint?: string;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [valueCode, setValueCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiBase, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setOptions(Array.isArray(data) ? data : []);
      else setError(data.error || "فشل التحميل");
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          label: label.trim(),
          ...(showValueCode && valueCode.trim() ? { value: valueCode.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل الإضافة");
        return;
      }
      setLabel("");
      setValueCode("");
      await loadOptions();
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(opt: Option) {
    if (!opt.id) return;
    if (!confirm(`هل تريد إزالة «${opt.label}» من القائمة؟`)) return;
    setDeletingId(opt.id);
    setError("");
    try {
      const res = await fetch(`${apiBase}/${opt.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل الحذف");
        return;
      }
      await loadOptions();
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <article className="rounded-2xl border border-[#d4cfc8] bg-white shadow-sm">
      <div className="border-b border-[#d4cfc8] bg-gradient-to-b from-[#f6f3ed] to-white px-6 py-5">
        <h2 className="text-xl font-semibold text-[#1B1B1B]">{title}</h2>
        <p className="mt-1 text-sm text-[#5a5a5a]">{description}</p>
      </div>

      <div className="p-6">
        <h3 className="mb-3 text-sm font-semibold text-[#1B1B1B]">إضافة خيار جديد</h3>
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-[#d4cfc8]/60 bg-[#f6f3ed]/25 p-4"
        >
          <div
            className={`grid gap-4 ${showValueCode ? "lg:grid-cols-[1fr_220px_auto]" : "lg:grid-cols-[1fr_auto]"}`}
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                الاسم المعروض *
              </label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="النص الذي يظهر في القائمة المنسدلة"
                className={INPUT_CLASS}
              />
            </div>
            {showValueCode && (
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                  رمز القيمة
                </label>
                <input
                  type="text"
                  value={valueCode}
                  onChange={(e) => setValueCode(e.target.value.toUpperCase())}
                  placeholder="اختياري"
                  className={INPUT_CLASS}
                  dir="ltr"
                  title={valueCodeHint}
                />
                <p className="mt-1 text-xs text-[#5a5a5a]">
                  {valueCodeHint ?? "أحرف إنجليزية كبيرة — يُولَّد تلقائياً إن تُرك فارغاً"}
                </p>
              </div>
            )}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting || !label.trim()}
                className="w-full rounded-xl bg-[#1E6B3A] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#175a2e] disabled:opacity-60 lg:min-w-[140px]"
              >
                {submitting ? "جاري الإضافة…" : "إضافة"}
              </button>
            </div>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </form>

        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#1B1B1B]">جدول الخيارات</h3>
            {!loading && (
              <span className="text-sm text-[#5a5a5a]">
                العدد: <span className="font-medium text-[#1B1B1B]">{options.length}</span>
              </span>
            )}
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-[#5a5a5a]">جاري التحميل…</p>
          ) : options.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#5a5a5a]">لا توجد خيارات مسجلة.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#d4cfc8]">
              <table className="w-full min-w-[520px] text-right text-sm">
                <thead>
                  <tr className="border-b border-[#d4cfc8] bg-[#f6f3ed]/80 text-[#5a6c7d]">
                    <th className="w-14 px-4 py-3 font-medium">م</th>
                    <th className="px-4 py-3 font-medium">الاسم المعروض</th>
                    {showValueCode && (
                      <th className="w-48 px-4 py-3 font-medium">رمز القيمة</th>
                    )}
                    <th className="w-28 px-4 py-3 font-medium text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((opt, idx) => (
                    <tr
                      key={opt.id ?? opt.value}
                      className="border-b border-[#d4cfc8]/70 last:border-0 hover:bg-[#f9f7f3]/80"
                    >
                      <td className="px-4 py-3 text-[#5a5a5a]">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#1B1B1B]">{opt.label}</td>
                      {showValueCode && (
                        <td className="px-4 py-3 text-[#5a5a5a]" dir="ltr">
                          {opt.value}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(opt)}
                          disabled={!opt.id || deletingId === opt.id}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === opt.id ? "…" : "حذف"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
