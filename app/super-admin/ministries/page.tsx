"use client";

import { useEffect, useState, useCallback } from "react";
import { broadcastDataUpdate } from "@/lib/broadcast-data-update";

type FormationOption = { id: string; name: string; type: string };

type FormationRow = {
  id: string;
  formationId: string;
  type: string;
  name: string;
  subDepartment: string;
  status: string;
  createdAt: string;
};

const FORMATION_TYPES = [
  "هيئة",
  "وزارة",
  "غرف تجارة وصناعة",
  "شركة حكومية",
  "شركة قطاع خاص",
  "غير مرتبطة بوزارة",
] as const;

const BORDER_RADIUS = "rounded-xl";
const INPUT_CLASS =
  "w-full rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25";

function FormationModal({
  open,
  onClose,
  initialData,
  onSubmit,
  submitting,
  error,
  onErrorClear,
  existingFormations,
  onSearchFormations,
}: {
  open: boolean;
  onClose: () => void;
  initialData?: FormationRow | null;
  onSubmit: (data: { type: string; name: string; subDepartment: string }) => Promise<void>;
  submitting: boolean;
  error: string;
  onErrorClear: () => void;
  existingFormations: FormationOption[];
  onSearchFormations: (q: string) => void;
}) {
  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [subDepartment, setSubDepartment] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const isEdit = !!initialData;
  const isExistingSelected = existingFormations.some(
    (f) => f.name.toLowerCase() === name.trim().toLowerCase()
  );

  useEffect(() => {
    if (open) {
      if (initialData) {
        setType(initialData.type || "");
        setName(initialData.name || "");
        setSubDepartment(initialData.subDepartment === "—" ? "" : initialData.subDepartment || "");
      } else {
        setType("");
        setName("");
        setSubDepartment("");
      }
      setShowSuggestions(false);
      onErrorClear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when modal opens or initialData changes
  }, [open, initialData]);

  useEffect(() => {
    const q = name.trim();
    if (q.length >= 2) onSearchFormations(q);
    else {
      onSearchFormations("");
      setShowSuggestions(false);
    }
  }, [name, onSearchFormations]);

  useEffect(() => {
    if (name.trim().length >= 2 && existingFormations.length > 0 && !isEdit) {
      setShowSuggestions(true);
    }
  }, [name, existingFormations, isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onErrorClear();
    if (!type.trim() || !name.trim()) return;
    await onSubmit({
      type: type.trim(),
      name: name.trim(),
      subDepartment: subDepartment.trim() || "—",
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1B1B1B]">
          {isEdit ? "تعديل دائرة فرعية" : "إضافة تشكيل جديد"}
        </h3>
        <p className="mt-1 text-sm text-[#5a5a5a]">
          أضف وزارة أو دوائر أو هيئات أو جهات
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              نوع التشكيل *
            </label>
            <select
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={INPUT_CLASS}
              disabled={isEdit || isExistingSelected}
            >
              <option value="">اختر نوع التشكيل</option>
              {FORMATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              اسم التشكيل *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => name.trim().length >= 2 && existingFormations.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 220)}
              placeholder="اكتب حرفين أو أكثر — اختر من المقترحات أو استمر بالكتابة لتشكيل جديد"
              className={INPUT_CLASS}
              disabled={isEdit}
              autoComplete="off"
            />
            {showSuggestions && existingFormations.length > 0 && !isEdit && (
              <div
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#d4cfc8] bg-white shadow-lg"
                onMouseDown={(e) => e.preventDefault()}
              >
                <p className="border-b border-[#d4cfc8] px-3 py-2 text-xs font-medium text-[#5a5a5a]">
                  تشكيلات محفوظة — اختر واحداً لإضافة دائرة فرعية، أو تجاهل واضغط خارج القائمة للاستمرار بكتابة تشكيل جديد
                </p>
                {existingFormations.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-right text-sm hover:bg-[#f6f3ed] focus:bg-[#f6f3ed]"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setName(f.name);
                      setType(f.type);
                      setShowSuggestions(false);
                    }}
                  >
                    <span className="font-medium text-[#1B1B1B]">{f.name}</span>
                    <span className="text-[#5a5a5a]">({f.type})</span>
                  </button>
                ))}
              </div>
            )}
            {isExistingSelected && (
              <p className="mt-1 text-xs font-medium text-[#1E6B3A]">
                ✓ التشكيل محفوظ — سيتم إضافة الدائرة الفرعية فقط
              </p>
            )}
            {name.trim().length >= 2 && existingFormations.length === 0 && !isEdit && (
              <p className="mt-1 text-xs text-[#5a5a5a]">
                لا توجد تشكيلات مطابقة — استمر بالكتابة وسيتم حفظ تشكيل جديد
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
              الدائرة الفرعية التابعة للتشكيل *
            </label>
            <input
              type="text"
              required
              value={subDepartment}
              onChange={(e) => setSubDepartment(e.target.value)}
              placeholder="اسم الدائرة الفرعية"
              className={INPUT_CLASS}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
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
              disabled={submitting}
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

export default function MinistriesPage() {
  const [rows, setRows] = useState<FormationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FormationRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [formationSearchResults, setFormationSearchResults] = useState<FormationOption[]>([]);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/ministries");
      if (res.ok) setRows(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const searchFormations = useCallback(async (q: string) => {
    if (q.length < 2) {
      setFormationSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/super-admin/ministries/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setFormationSearchResults(data);
      } else {
        setFormationSearchResults([]);
      }
    } catch {
      setFormationSearchResults([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRows = rows.filter((r) => {
    const matchSearch =
      !searchQuery.trim() ||
      r.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      r.subDepartment.toLowerCase().includes(searchQuery.trim().toLowerCase());
    const matchType = !filterType || r.type === filterType;
    const matchStatus = !filterStatus || r.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const uniqueFormationNames = new Set(filteredRows.map((r) => r.name));
  const ministriesCount = new Set(filteredRows.filter((r) => r.type === "وزارة").map((r) => r.name)).size;
  const hayatCount = new Set(filteredRows.filter((r) => r.type === "هيئة").map((r) => r.name)).size;
  const govCompaniesCount = new Set(filteredRows.filter((r) => r.type === "شركة حكومية").map((r) => r.name)).size;
  const privateCompaniesCount = new Set(filteredRows.filter((r) => r.type === "شركة قطاع خاص").map((r) => r.name)).size;
  const chambersCount = new Set(filteredRows.filter((r) => r.type === "غرف تجارة وصناعة").map((r) => r.name)).size;
  const notLinkedCount = new Set(filteredRows.filter((r) => r.type === "غير مرتبطة بوزارة").map((r) => r.name)).size;
  const totalFormationsCount = uniqueFormationNames.size;
  const totalSubDepartmentsCount = filteredRows.length;

  const statCards = [
    { label: "الوزارات", value: ministriesCount },
    { label: "الهيئات", value: hayatCount },
    { label: "الشركات الحكومية", value: govCompaniesCount },
    { label: "الشركات القطاع الخاص", value: privateCompaniesCount },
    { label: "غرف التجارة أو الصناعة", value: chambersCount },
    { label: "غير مرتبطة بوزارة", value: notLinkedCount },
    { label: "عدد التشكيلات الكلية", value: totalFormationsCount },
    { label: "عدد الدوائر الفرعية الكلية", value: totalSubDepartmentsCount },
  ];

  const handleSubmit = async (data: {
    type: string;
    name: string;
    subDepartment: string;
  }) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      if (editingRow) {
        const res = await fetch(`/api/super-admin/ministries/subdepts/${editingRow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subDepartment: data.subDepartment,
          }),
        });
        const body = await res.json();
        if (!res.ok) {
          setSubmitError(body.error || "فشل التحديث");
          return;
        }
        setRows((prev) => prev.map((r) => (r.id === editingRow.id ? body : r)));
      } else {
        const res = await fetch("/api/super-admin/ministries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) {
          setSubmitError(body.error || "فشل الإضافة");
          return;
        }
        setRows((prev) => [body, ...prev]);
      }
      setModalOpen(false);
      setEditingRow(null);
      loadData();
      broadcastDataUpdate();
    } catch {
      setSubmitError("حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: FormationRow) => {
    if (!confirm(`هل تريد حذف الدائرة الفرعية «${row.subDepartment}» من «${row.name}»؟`)) return;
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/super-admin/ministries/subdepts/${row.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        loadData();
        broadcastDataUpdate();
      } else {
        const body = await res.json();
        alert(body.error || "فشل الحذف");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const toggleStatus = async (row: FormationRow) => {
    const nextStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTogglingId(row.id);
    try {
      const res = await fetch(`/api/super-admin/ministries/subdepts/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const body = await res.json();
        setRows((prev) => prev.map((r) => (r.id === row.id ? body : r)));
        broadcastDataUpdate();
      } else {
        const body = await res.json();
        alert(body.error || "فشل التحديث");
      }
    } finally {
      setTogglingId(null);
    }
  };

  function formatDate(s: string): string {
    try {
      return new Intl.DateTimeFormat("ar-IQ", {
        dateStyle: "medium",
        numberingSystem: "arab",
      }).format(new Date(s));
    } catch {
      return s;
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">وزارات و دوائر و هيئات</h1>
        <button
          type="button"
          onClick={() => {
            setEditingRow(null);
            setModalOpen(true);
          }}
          className="rounded-xl bg-[#1E6B3A] px-4 py-2.5 font-medium text-white transition hover:bg-[#175a2e]"
        >
          إضافة تشكيل
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col rounded-2xl border border-[#d4cfc8] bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1E6B3A]/10 text-[#1E6B3A]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-[#5a5a5a]">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-[#1B1B1B]">{loading ? "—" : card.value}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#d4cfc8] bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الاسم أو النوع أو الدائرة الفرعية…"
            className="w-full rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] py-2.5 pl-3 pr-10 text-[#1B1B1B] placeholder:text-[#5a5a5a] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25"
          />
          <svg
            className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5a5a5a]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25 min-w-[160px]"
        >
          <option value="">جميع الأنواع</option>
          {FORMATION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-[#d4cfc8] bg-[#f6f3ed] px-3 py-2.5 text-[#1B1B1B] focus:border-[#B08D57] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/25 min-w-[140px]"
        >
          <option value="">جميع الحالات</option>
          <option value="ACTIVE">مفعّل</option>
          <option value="INACTIVE">معطّل</option>
        </select>
      </div>

      <article className="rounded-2xl border border-[#d4cfc8] bg-white p-6 shadow-sm">
        {loading ? (
          <p className="py-8 text-center text-[#5a5a5a]">جاري التحميل…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-[#5a5a5a]">لا توجد تشكيلات أو دوائر فرعية مسجلة.</p>
        ) : filteredRows.length === 0 ? (
          <p className="py-8 text-center text-[#5a5a5a]">لا توجد نتائج مطابقة للبحث أو الفلتر.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-right">
              <thead>
                <tr className="border-b border-[#d4cfc8] text-sm font-medium text-[#5a5a5a]">
                  <th className="py-3 pr-2">نوع التشكيل</th>
                  <th className="py-3 pr-2">اسم التشكيل</th>
                  <th className="py-3 pr-2">الدائرة الفرعية التابعة للتشكيل</th>
                  <th className="py-3 pr-2">الحالة</th>
                  <th className="py-3 pr-2">تاريخ الإضافة</th>
                  <th className="py-3 pl-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id} className="border-b border-[#d4cfc8]/80 last:border-0">
                    <td className="py-3 pr-2 font-medium text-[#1B1B1B]">{r.type || "—"}</td>
                    <td className="py-3 pr-2 text-[#1B1B1B]">{r.name || "—"}</td>
                    <td
                      className="max-w-[200px] truncate py-3 pr-2 text-[#5a5a5a]"
                      title={r.subDepartment || undefined}
                    >
                      {r.subDepartment === "—" ? "—" : r.subDepartment || "—"}
                    </td>
                    <td className="py-3 pr-2">
                      <span
                        className={
                          r.status === "ACTIVE"
                            ? "font-medium text-[#1E6B3A]"
                            : "font-medium text-amber-600"
                        }
                      >
                        {r.status === "ACTIVE" ? "مفعّل" : "معطّل"}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-[#5a5a5a]">{formatDate(r.createdAt)}</td>
                    <td className="py-3 pl-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRow(r);
                            setModalOpen(true);
                          }}
                          className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed]"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(r)}
                          disabled={togglingId === r.id}
                          className="rounded-lg border border-[#d4cfc8] bg-white px-2 py-1 text-xs font-medium text-[#B08D57] hover:bg-[#f6f3ed] disabled:opacity-60"
                        >
                          {togglingId === r.id ? "…" : r.status === "ACTIVE" ? "تعطيل" : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          disabled={deletingId === r.id}
                          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === r.id ? "…" : "حذف"}
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

      <FormationModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingRow(null);
          setSubmitError("");
        }}
        initialData={editingRow}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={submitError}
        onErrorClear={() => setSubmitError("")}
        existingFormations={formationSearchResults}
        onSearchFormations={searchFormations}
      />
    </div>
  );
}
