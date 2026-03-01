"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TransactionReceipt, type ReceiptData } from "@/components/TransactionReceipt";

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[#1B1B1B] focus:border-[#0D9488] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20";

const STORAGE_KEY = "gate-sadikon-citizen-names";
const STORAGE_KEY_IDS = "gate-sadikon-citizen-ids";

function loadStoredNames(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveNameToStorage(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = loadStoredNames();
  const key = trimmed.toLowerCase();
  const without = existing.filter((n) => n.toLowerCase() !== key);
  const updated = [trimmed, ...without].slice(0, 100);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

function loadStoredIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_IDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveIdToStorage(id: string) {
  const trimmed = id.trim();
  if (!trimmed) return;
  const existing = loadStoredIds();
  const key = trimmed.toLowerCase();
  const without = existing.filter((n) => n.toLowerCase() !== key);
  const updated = [trimmed, ...without].slice(0, 100);
  try {
    localStorage.setItem(STORAGE_KEY_IDS, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

type Formation = { id: string; name: string; type: string };
type SubDept = { id: string; name: string; formationId: string };

const TRANSACTION_TYPES = [
  { value: "طلب", label: "طلب" },
  { value: "طلب نقل خدمات بين وزارتين", label: "طلب نقل خدمات بين وزارتين" },
  { value: "نقل خدمات بين تشكيلين في وزارة", label: "نقل خدمات بين تشكيلين في وزارة" },
  { value: "طلب تخصيص قطعة ارض", label: "طلب تخصيص قطعة ارض" },
  { value: "طلب تعيين", label: "طلب تعيين" },
  { value: "طلب تشغيل", label: "طلب تشغيل" },
  { value: "تظلم", label: "تظلم" },
  { value: "مفاتحة", label: "مفاتحة" },
  { value: "طلب رعاية اجتماعية", label: "طلب رعاية اجتماعية" },
];

const EMPLOYEE_SECTOR_OPTIONS = [
  { value: "GOVERNMENT", label: "موظف حكومي" },
  { value: "PRIVATE", label: "موظف قطاع خاص" },
  { value: "NOT_LINKED", label: "موظف في جهة غير مرتبطة بوزارة" },
  { value: "MIXED", label: "موظف في قطاع مشترك" },
  { value: "OTHER", label: "موظف في جهة اخرى" },
] as const;

function ReceptionNewTransactionContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit")?.trim() || null;

  const [fullName, setFullName] = useState("");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [allCitizenNames, setAllCitizenNames] = useState<string[]>([]);
  const [citizenId, setCitizenId] = useState("");
  const [showCitizenIdSuggestions, setShowCitizenIdSuggestions] = useState(false);
  const [allCitizenIds, setAllCitizenIds] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);
  const [employeeSector, setEmployeeSector] = useState("");

  // معلومات المعاملة
  const [transactionType, setTransactionType] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [submissionDate, setSubmissionDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [txFormationId, setTxFormationId] = useState("");
  const [txSubDeptId, setTxSubDeptId] = useState("");
  const [txSubDepts, setTxSubDepts] = useState<SubDept[]>([]);
  const [attachments, setAttachments] = useState<
    { url: string; name?: string; size?: number }[]
  >([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // حقول خاصة بالموظف الحكومي
  const [ministryName, setMinistryName] = useState("");
  const [formationId, setFormationId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [showMinistrySuggestions, setShowMinistrySuggestions] = useState(false);
  const [showDepartmentSuggestions, setShowDepartmentSuggestions] = useState(false);

  // حقول نصية حسب النوع
  const [organizationName, setOrganizationName] = useState("");
  const [unlinkedEntityName, setUnlinkedEntityName] = useState("");
  const [unlinkedDepartmentName, setUnlinkedDepartmentName] = useState("");
  const [showUnlinkedSuggestions, setShowUnlinkedSuggestions] = useState(false);
  const [showUnlinkedDeptSuggestions, setShowUnlinkedDeptSuggestions] = useState(false);
  const [otherEntityName, setOtherEntityName] = useState("");
  const [mixedEntityName, setMixedEntityName] = useState("");

  const [formations, setFormations] = useState<Formation[]>([]);
  const [subDepts, setSubDepts] = useState<SubDept[]>([]);
  const [formationsLoading, setFormationsLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editLoadError, setEditLoadError] = useState("");

  const loadFormations = useCallback(async () => {
    setFormationsLoading(true);
    try {
      const res = await fetch("/api/formations", { credentials: "include" });
      const data = await res.json().catch(() => []);
      setFormations(Array.isArray(data) ? data : []);
    } catch {
      setFormations([]);
    } finally {
      setFormationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFormations();
  }, [loadFormations]);

  useEffect(() => {
    const storedNames = loadStoredNames();
    const storedIds = loadStoredIds();
    fetch("/api/reception/citizen-names", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return { names: [] as string[], citizenIds: [] as string[] };
        const data = await res.json().catch(() => ({}));
        return {
          names: Array.isArray(data?.names) ? data.names : [],
          citizenIds: Array.isArray(data?.citizenIds) ? data.citizenIds : [],
        };
      })
      .then(({ names, citizenIds }) => {
        const seenN = new Set<string>();
        const mergedNames: string[] = [];
        for (const n of [...storedNames, ...names]) {
          const s = (n || "").trim();
          if (!s) continue;
          const k = s.toLowerCase();
          if (!seenN.has(k)) {
            seenN.add(k);
            mergedNames.push(s);
          }
        }
        mergedNames.sort((a, b) => a.localeCompare(b, "ar"));
        setAllCitizenNames(mergedNames);

        const seenI = new Set<string>();
        const mergedIds: string[] = [];
        for (const i of [...storedIds, ...citizenIds]) {
          const s = (i || "").trim();
          if (!s) continue;
          const k = s.toLowerCase();
          if (!seenI.has(k)) {
            seenI.add(k);
            mergedIds.push(s);
          }
        }
        mergedIds.sort((a, b) => a.localeCompare(b, "ar"));
        setAllCitizenIds(mergedIds);
      })
      .catch(() => {
        setAllCitizenNames(storedNames);
        setAllCitizenIds(storedIds);
      });
  }, []);

  useEffect(() => {
    if (!editId || formationsLoading) return;
    setEditLoading(true);
    setEditLoadError("");
    fetch(`/api/admin/transactions/${editId}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("فشل تحميل المعاملة");
        return res.json();
      })
      .then(async (t: Record<string, unknown>) => {
        setFullName((t.citizenName as string) || "");
        setCitizenId((t.citizenId as string) || "");
        setPhone((t.citizenPhone as string) || "");
        setAddress((t.citizenAddress as string) || "");
        setIsEmployee(t.citizenIsEmployee === true ? true : t.citizenIsEmployee === false ? false : null);
        setEmployeeSector((t.citizenEmployeeSector as string) || "");
        setTransactionType((t.transactionType as string) || (t.type as string) || "");
        setTransactionDescription((t.transactionTitle as string) || "");
        setSubmissionDate(
          t.submissionDate
            ? (t.submissionDate as string).slice(0, 10)
            : new Date().toISOString().slice(0, 10)
        );
        setTxFormationId((t.formationId as string) || "");
        setTxSubDeptId((t.subDeptId as string) || "");

        const atts = Array.isArray(t.attachments) ? t.attachments : [];
        const validAtts = atts
          .filter((a): a is { url?: string; name?: string } => a && typeof a === "object" && typeof (a as { url?: string }).url === "string")
          .map((a) => ({ url: a.url!, name: a.name }));
        setAttachments(validAtts.length > 0 ? validAtts.map((a) => ({ ...a, size: 0 })) : [{ url: "" }]);

        const sector = t.citizenEmployeeSector as string;
        if (sector === "GOVERNMENT" && t.citizenMinistry) {
          const ministries = formations.filter((f) => f.type === "وزارة");
          const match = ministries.find(
            (m) => (m.name || "").trim().toLowerCase() === ((t.citizenMinistry as string) || "").trim().toLowerCase()
          );
          if (match) {
            setFormationId(match.id);
            setMinistryName(match.name);
            if (t.citizenDepartment) {
              const subRes = await fetch(`/api/formations/subdepts?formationId=${match.id}`, { credentials: "include" });
              const subList: SubDept[] = subRes.ok ? await subRes.json().catch(() => []) : [];
              const subMatch = subList.find(
                (s) => (s.name || "").trim().toLowerCase() === ((t.citizenDepartment as string) || "").trim().toLowerCase()
              );
              if (subMatch) {
                setDepartmentId(subMatch.id);
                setDepartmentName(subMatch.name);
              } else {
                setDepartmentName((t.citizenDepartment as string) || "");
              }
            }
          } else {
            setMinistryName((t.citizenMinistry as string) || "");
            setDepartmentName((t.citizenDepartment as string) || "");
          }
        } else if (sector === "PRIVATE" && t.citizenOrganization) {
          setOrganizationName((t.citizenOrganization as string) || "");
        } else if (sector === "NOT_LINKED") {
          if (t.citizenOrganization) setUnlinkedEntityName((t.citizenOrganization as string) || "");
          const unlinked = formations.filter((f) => f.type === "غير مرتبطة بوزارة");
          const match = unlinked.find(
            (m) => (m.name || "").trim().toLowerCase() === ((t.citizenOrganization as string) || "").trim().toLowerCase()
          );
          if (match) setFormationId(match.id);
        } else if (sector === "MIXED" && t.citizenOrganization) {
          setMixedEntityName((t.citizenOrganization as string) || "");
        } else if (sector === "OTHER" && t.citizenOrganization) {
          setOtherEntityName((t.citizenOrganization as string) || "");
        }
      })
      .catch(() => setEditLoadError("فشل تحميل بيانات المعاملة"))
      .finally(() => setEditLoading(false));
  }, [editId, formations, formationsLoading]);

  useEffect(() => {
    if (!formationId) {
      setSubDepts([]);
      setDepartmentId("");
      return;
    }
    fetch(`/api/formations/subdepts?formationId=${encodeURIComponent(formationId)}`)
      .then(async (r) => {
        const t = await r.text();
        try {
          return r.ok && t.trim() ? JSON.parse(t) : [];
        } catch {
          return [];
        }
      })
      .then(setSubDepts)
      .catch(() => setSubDepts([]));
    setDepartmentId("");
  }, [formationId]);

  useEffect(() => {
    if (!txFormationId) {
      setTxSubDepts([]);
      setTxSubDeptId("");
      return;
    }
    fetch(`/api/formations/subdepts?formationId=${encodeURIComponent(txFormationId)}`)
      .then(async (r) => {
        const t = await r.text();
        try {
          return r.ok && t.trim() ? JSON.parse(t) : [];
        } catch {
          return [];
        }
      })
      .then(setTxSubDepts)
      .catch(() => setTxSubDepts([]));
    setTxSubDeptId("");
  }, [txFormationId]);

  const clearEmployeeSubFields = () => {
    setMinistryName("");
    setFormationId("");
    setDepartmentId("");
    setDepartmentName("");
    setOrganizationName("");
    setUnlinkedEntityName("");
    setUnlinkedDepartmentName("");
    setOtherEntityName("");
    setMixedEntityName("");
  };

  const ministries = formations.filter((f) => f.type === "وزارة");
  const unlinkedFormations = formations.filter((f) => f.type === "غير مرتبطة بوزارة");

  const uniqueFormationsForTransaction = formations.filter((f, i, arr) => {
    const key = f.name.trim().toLowerCase();
    return arr.findIndex((x) => x.name.trim().toLowerCase() === key) === i;
  });

  const nameSuggestions =
    fullName.trim().length >= 2
      ? allCitizenNames.filter((n) =>
          n.toLowerCase().includes(fullName.trim().toLowerCase())
        )
      : [];

  const citizenIdSuggestions =
    citizenId.trim().length >= 2
      ? allCitizenIds.filter((id) =>
          id.toLowerCase().includes(citizenId.trim().toLowerCase())
        )
      : [];

  const ministrySuggestions =
    ministryName.trim().length >= 2
      ? ministries.filter((m) =>
          m.name.toLowerCase().includes(ministryName.trim().toLowerCase())
        )
      : [];

  const departmentSuggestions =
    formationId && departmentName.trim().length >= 2
      ? subDepts.filter((s) =>
          s.name.toLowerCase().includes(departmentName.trim().toLowerCase())
        )
      : [];

  const unlinkedSuggestions =
    unlinkedEntityName.trim().length >= 2
      ? unlinkedFormations.filter((f) =>
          f.name.toLowerCase().includes(unlinkedEntityName.trim().toLowerCase())
        )
      : [];

  const unlinkedDeptSuggestions =
    employeeSector === "NOT_LINKED" &&
    formationId &&
    unlinkedDepartmentName.trim().length >= 2
      ? subDepts.filter((s) =>
          s.name
            .toLowerCase()
            .includes(unlinkedDepartmentName.trim().toLowerCase())
        )
      : [];

  const getCitizenMinistry = () => {
    if (employeeSector !== "GOVERNMENT") return undefined;
    if (formationId) {
      const f = ministries.find((m) => m.id === formationId);
      return (f?.name ?? ministryName.trim()) || undefined;
    }
    return ministryName.trim() || undefined;
  };

  const getCitizenDepartment = () => {
    if (employeeSector === "GOVERNMENT") {
      if (departmentId) {
        const s = subDepts.find((d) => d.id === departmentId);
        return (s?.name ?? departmentName.trim()) || undefined;
      }
      return departmentName.trim() || undefined;
    }
    if (employeeSector === "NOT_LINKED") {
      if (departmentId) {
        const s = subDepts.find((d) => d.id === departmentId);
        return (s?.name ?? unlinkedDepartmentName.trim()) || undefined;
      }
      return unlinkedDepartmentName.trim() || undefined;
    }
    return undefined;
  };

  const getCitizenOrganization = () => {
    if (employeeSector === "PRIVATE") return organizationName.trim() || undefined;
    if (employeeSector === "MIXED") return mixedEntityName.trim() || undefined;
    if (employeeSector === "OTHER") return otherEntityName.trim() || undefined;
    if (employeeSector === "NOT_LINKED") {
      if (formationId) {
        const f = unlinkedFormations.find((m) => m.id === formationId);
        return (f?.name ?? unlinkedEntityName.trim()) || undefined;
      }
      return unlinkedEntityName.trim() || undefined;
    }
    return undefined;
  };

  const handleFileUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await uploadFile(index, file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadFile = async (index: number, file: File) => {
    setUploadingIndex(index);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const text = await res.text();
      let data: { url?: string; error?: string } = {};
      try {
        if (text.trim()) data = JSON.parse(text);
      } catch {
        data = { error: "استجابة غير صالحة" };
      }
      if (res.ok && data.url) {
        setAttachments((prev) => {
          const next = [...prev];
          next[index] = {
            url: data.url!,
            name: file.name,
            size: file.size,
          };
          return next;
        });
      } else {
        alert(data.error || "فشل رفع الملف");
      }
    } catch {
      alert("فشل رفع الملف");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(pdf|jpe?g|png|webp)$/i.test(f.name) || f.type.startsWith("image/")
    );
    if (files.length === 0) return;
    const idx = index ?? attachments.length;
    setAttachments((prev) => {
      const next = [...prev];
      while (next.length <= idx) next.push({ url: "" });
      return next;
    });
    uploadFile(idx, files[0]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("الاسم الكامل واللقب مطلوب");
      return;
    }
    setSubmitting(true);
    try {
      const validAttachments = attachments
        .filter((a) => a.url)
        .map(({ url, name }) => ({ url, name }));
      const payload = {
        citizenId: citizenId.trim() || null,
        citizenName: fullName.trim(),
        citizenPhone: phone.trim() || null,
        citizenAddress: address.trim() || null,
        citizenIsEmployee: isEmployee ?? undefined,
        citizenEmployeeSector: employeeSector || undefined,
        citizenMinistry: getCitizenMinistry() ?? null,
        citizenDepartment: getCitizenDepartment() ?? null,
        citizenOrganization: getCitizenOrganization() ?? null,
        transactionType: transactionType || null,
        transactionTitle: transactionDescription.trim() || transactionType || null,
        submissionDate: submissionDate || null,
        formationId: txFormationId || null,
        subDeptId: txSubDeptId || null,
        attachments:
          validAttachments.length > 0 ? validAttachments : null,
      };
      const url = editId
        ? `/api/admin/transactions/${editId}`
        : "/api/admin/transactions";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data: {
        error?: string;
        serialNumber?: string;
        followUpUrl?: string;
        officeName?: string;
        citizenName?: string;
        citizenPhone?: string;
        submissionDate?: string;
        createdAt?: string;
        transactionType?: string;
      } = {};
      try {
        if (text.trim()) data = JSON.parse(text);
      } catch {}
      if (res.ok) {
        saveNameToStorage(fullName.trim());
        if (citizenId.trim()) saveIdToStorage(citizenId.trim());
        const formationName = (data as { formationName?: string }).formationName
          ?? (txFormationId ? formations.find((f) => f.id === txFormationId)?.name ?? null : null);
        const subDeptName = (data as { subDeptName?: string }).subDeptName
          ?? (txSubDeptId ? txSubDepts.find((s) => s.id === txSubDeptId)?.name ?? null : null);
        setReceipt({
          citizenName: (data.citizenName ?? fullName.trim()) || null,
          citizenPhone: (data.citizenPhone ?? phone.trim()) || null,
          citizenAddress: address.trim() || null,
          citizenMinistry: getCitizenMinistry() ?? null,
          citizenDepartment: getCitizenDepartment() ?? null,
          citizenOrganization: getCitizenOrganization() ?? null,
          transactionType: (data.transactionType ?? transactionType) || null,
          formationName: formationName ?? null,
          subDeptName: subDeptName ?? null,
          officeName: data.officeName ?? null,
          serialNumber: data.serialNumber ?? null,
          followUpUrl: (data as { followUpUrl?: string }).followUpUrl ?? data.followUpUrl ?? null,
          submissionDate: (data.submissionDate ?? submissionDate) || null,
          createdAt: data.createdAt ?? null,
        });
      } else {
        setError(data.error || "فشل الحفظ");
      }
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const completionPercent = (() => {
    let score = 0;
    if (fullName.trim()) score += 15;
    if (phone.trim()) score += 10;
    if (address.trim()) score += 10;
    if (isEmployee !== null) score += 5;
    if (isEmployee === true && (getCitizenMinistry() || getCitizenDepartment() || getCitizenOrganization())) score += 15;
    else if (isEmployee === false) score += 15;
    if (transactionType) score += 15;
    if (submissionDate) score += 10;
    if (txFormationId) score += 15;
    if (txSubDeptId) score += 5;
    if (attachments.some((a) => a.url)) score += 5;
    return Math.min(100, score);
  })();

  if (receipt) {
    return (
      <div className="pb-24" dir="rtl">
        <TransactionReceipt receipt={receipt} mode="standalone" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/reception/citizens"
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#1B1B1B] hover:bg-gray-50"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          العودة إلى شؤون المواطنين
        </Link>
        <h1 className="text-xl font-bold text-[#1B1B1B]">
          {editId ? "تعديل المعاملة" : "معاملة جديدة"}
        </h1>
      </div>

      {editLoading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          جاري تحميل بيانات المعاملة…
        </div>
      )}
      {editLoadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {editLoadError}{" "}
          <Link href="/reception/citizens" className="underline">
            العودة
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 pb-4" style={{ display: editLoading ? "none" : undefined }}>
        {/* مؤشر اكتمال البيانات */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-4">
            <span className="shrink-0 text-sm font-medium text-[#1B1B1B]">
              اكتمال البيانات: <strong className="text-[#0D9488]">{completionPercent}%</strong>
            </span>
            <div className="min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200 h-2.5">
              <div
                className="h-full rounded-full bg-[#0D9488] transition-all duration-300 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

      <article className="rounded-lg border border-gray-200 bg-white p-6 pb-24 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-6 md:pb-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-4 flex items-center gap-2 rounded border-r-4 border-[#0D9488] bg-gray-50 px-3 py-2 text-base font-bold text-[#1B1B1B]">
            <span className="text-lg">👤</span>
            معلومات المواطن
          </h4>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">الاسم الكامل واللقب *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setShowNameSuggestions(e.target.value.trim().length >= 2);
                }}
                onFocus={() => {
                  if (fullName.trim().length >= 2) setShowNameSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                required
                className={INPUT_CLASS}
                placeholder="اكتب حرفين أو أكثر لعرض اقتراحات أسماء سابقة"
                autoComplete="off"
              />
              {showNameSuggestions && nameSuggestions.length > 0 && (
                <ul className="absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                  {nameSuggestions.map((n) => (
                    <li key={n}>
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-right text-sm text-[#1B1B1B] hover:bg-gray-50"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFullName(n);
                          setShowNameSuggestions(false);
                        }}
                      >
                        {n}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">رقم الهاتف</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={INPUT_CLASS}
                placeholder="07XXXXXXXX"
                dir="ltr"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">العنوان</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={INPUT_CLASS}
                placeholder="العنوان الكامل"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[#1B1B1B]">هل أنت موظف؟</label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="isEmployee"
                    checked={isEmployee === true}
                    onChange={() => {
                      setIsEmployee(true);
                      setEmployeeSector("");
                      clearEmployeeSubFields();
                    }}
                    className="h-4 w-4 border-gray-300 text-[#0D9488] focus:ring-[#0D9488]"
                  />
                  <span>نعم</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="isEmployee"
                    checked={isEmployee === false}
                    onChange={() => {
                      setIsEmployee(false);
                      setEmployeeSector("");
                      clearEmployeeSubFields();
                    }}
                    className="h-4 w-4 border-gray-300 text-[#0D9488] focus:ring-[#0D9488]"
                  />
                  <span>لا</span>
                </label>
              </div>
            </div>

            {isEmployee === true && (
              <>
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">نوع التوظيف</label>
                  <select
                    value={employeeSector}
                    onChange={(e) => {
                      setEmployeeSector(e.target.value);
                      clearEmployeeSubFields();
                    }}
                    className={INPUT_CLASS}
                  >
                    <option value="">اختر النوع</option>
                    {EMPLOYEE_SECTOR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {employeeSector === "GOVERNMENT" && (
                  <>
                    <div className="relative">
                      <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">اسم الوزارة</label>
                      <input
                        type="text"
                        value={ministryName}
                        onChange={(e) => {
                          setMinistryName(e.target.value);
                          setFormationId("");
                          setDepartmentId("");
                          setShowMinistrySuggestions(e.target.value.trim().length >= 2);
                        }}
                        onFocus={() => {
                          if (ministryName.trim().length >= 2)
                            setShowMinistrySuggestions(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowMinistrySuggestions(false), 200);
                        }}
                        className={INPUT_CLASS}
                        placeholder="اكتب حرفين أو أكثر للبحث عن الوزارة"
                        disabled={formationsLoading}
                        autoComplete="off"
                      />
                      {showMinistrySuggestions && ministrySuggestions.length > 0 && (
                        <ul className="absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                          {ministrySuggestions.map((m) => (
                            <li key={m.id}>
                              <button
                                type="button"
                                className="w-full px-3 py-2.5 text-right text-sm text-[#1B1B1B] hover:bg-gray-50"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setMinistryName(m.name);
                                  setFormationId(m.id);
                                  setDepartmentId("");
                                  setDepartmentName("");
                                  setShowMinistrySuggestions(false);
                                }}
                              >
                                {m.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="relative">
                      <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">الدائرة</label>
                      {formationId ? (
                        <>
                          <input
                            type="text"
                            value={departmentName}
                            onChange={(e) => {
                              setDepartmentName(e.target.value);
                              setDepartmentId("");
                              setShowDepartmentSuggestions(e.target.value.trim().length >= 2);
                            }}
                            onFocus={() => {
                              if (departmentName.trim().length >= 2)
                                setShowDepartmentSuggestions(true);
                            }}
                            onBlur={() => {
                              setTimeout(() => setShowDepartmentSuggestions(false), 200);
                            }}
                            className={INPUT_CLASS}
                            placeholder="اكتب حرفين أو أكثر للبحث عن الدائرة"
                            autoComplete="off"
                          />
                          {showDepartmentSuggestions && departmentSuggestions.length > 0 && (
                            <ul className="absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                              {departmentSuggestions.map((s) => (
                                <li key={s.id}>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2.5 text-right text-sm text-[#1B1B1B] hover:bg-gray-50"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setDepartmentName(s.name);
                                      setDepartmentId(s.id);
                                      setShowDepartmentSuggestions(false);
                                    }}
                                  >
                                    {s.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : (
                        <input
                          type="text"
                          value={departmentName}
                          onChange={(e) => setDepartmentName(e.target.value)}
                          className={INPUT_CLASS}
                          placeholder="اسم الدائرة"
                        />
                      )}
                    </div>
                  </>
                )}

                {employeeSector === "PRIVATE" && (
                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">اسم الشركة أو الجهة</label>
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="اسم الشركة أو الجهة"
                    />
                  </div>
                )}

                {employeeSector === "NOT_LINKED" && (
                  <>
                    <div className="relative">
                      <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                        اسم الهيئة أو الجهة غير المرتبطة بوزارة
                      </label>
                      <input
                        type="text"
                        value={unlinkedEntityName}
                        onChange={(e) => {
                          setUnlinkedEntityName(e.target.value);
                          setFormationId("");
                          setDepartmentId("");
                          setUnlinkedDepartmentName("");
                          setShowUnlinkedSuggestions(
                            e.target.value.trim().length >= 2
                          );
                        }}
                        onFocus={() => {
                          if (unlinkedEntityName.trim().length >= 2)
                            setShowUnlinkedSuggestions(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowUnlinkedSuggestions(false), 200);
                        }}
                        className={INPUT_CLASS}
                        placeholder="اكتب حرفين أو أكثر للبحث عن الهيئة أو الجهة"
                        disabled={formationsLoading}
                        autoComplete="off"
                      />
                      {showUnlinkedSuggestions &&
                        unlinkedSuggestions.length > 0 && (
                          <ul className="absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                            {unlinkedSuggestions.map((f) => (
                              <li key={f.id}>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2.5 text-right text-sm text-[#1B1B1B] hover:bg-gray-50"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setUnlinkedEntityName(f.name);
                                    setFormationId(f.id);
                                    setDepartmentId("");
                                    setUnlinkedDepartmentName("");
                                    setShowUnlinkedSuggestions(false);
                                  }}
                                >
                                  {f.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                    </div>
                    <div className="relative">
                      <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                        الدائرة
                      </label>
                      {formationId ? (
                        <>
                          <input
                            type="text"
                            value={unlinkedDepartmentName}
                            onChange={(e) => {
                              setUnlinkedDepartmentName(e.target.value);
                              setDepartmentId("");
                              setShowUnlinkedDeptSuggestions(
                                e.target.value.trim().length >= 2
                              );
                            }}
                            onFocus={() => {
                              if (
                                unlinkedDepartmentName.trim().length >= 2
                              )
                                setShowUnlinkedDeptSuggestions(true);
                            }}
                            onBlur={() => {
                              setTimeout(
                                () => setShowUnlinkedDeptSuggestions(false),
                                200
                              );
                            }}
                            className={INPUT_CLASS}
                            placeholder="اكتب حرفين أو أكثر للبحث عن الدائرة"
                            autoComplete="off"
                          />
                          {showUnlinkedDeptSuggestions &&
                            unlinkedDeptSuggestions.length > 0 && (
                              <ul className="absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                                {unlinkedDeptSuggestions.map((s) => (
                                  <li key={s.id}>
                                    <button
                                      type="button"
                                      className="w-full px-3 py-2.5 text-right text-sm text-[#1B1B1B] hover:bg-gray-50"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setUnlinkedDepartmentName(s.name);
                                        setDepartmentId(s.id);
                                        setShowUnlinkedDeptSuggestions(false);
                                      }}
                                    >
                                      {s.name}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                        </>
                      ) : (
                        <input
                          type="text"
                          value={unlinkedDepartmentName}
                          onChange={(e) =>
                            setUnlinkedDepartmentName(e.target.value)
                          }
                          className={INPUT_CLASS}
                          placeholder="اسم الدائرة"
                        />
                      )}
                    </div>
                  </>
                )}

                {employeeSector === "MIXED" && (
                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">اسم الجهة</label>
                    <input
                      type="text"
                      value={mixedEntityName}
                      onChange={(e) => setMixedEntityName(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="اسم الجهة"
                    />
                  </div>
                )}

                {employeeSector === "OTHER" && (
                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">اسم الجهة</label>
                    <input
                      type="text"
                      value={otherEntityName}
                      onChange={(e) => setOtherEntityName(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="اسم الجهة"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* معلومات المعاملة */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-4 flex items-center gap-2 rounded border-r-4 border-[#0D9488] bg-gray-50 px-3 py-2 text-base font-bold text-[#1B1B1B]">
            <span className="text-lg">📄</span>
            معلومات المعاملة
          </h4>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">نوع المعاملة</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">اختر نوع المعاملة</option>
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                تاريخ تقديم المعاملة
              </label>
              <input
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                max={today}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                الوزارة أو الجهة المراد مخاطبتها
              </label>
              <select
                value={txFormationId}
                onChange={(e) => setTxFormationId(e.target.value)}
                className={INPUT_CLASS}
                disabled={formationsLoading}
              >
                <option value="">
                  {formationsLoading ? "جاري التحميل…" : "اختر الوزارة أو الجهة"}
                </option>
                {uniqueFormationsForTransaction.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">
                الدائرة الفرعية
              </label>
              <select
                value={txSubDeptId}
                onChange={(e) => setTxSubDeptId(e.target.value)}
                className={INPUT_CLASS}
                disabled={!txFormationId}
              >
                <option value="">اختر الدائرة الفرعية</option>
                {txSubDepts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* معرف المواطن */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-4 flex items-center gap-2 rounded border-r-4 border-[#0D9488] bg-gray-50 px-3 py-2 text-base font-bold text-[#1B1B1B]">
            <span className="text-lg">🪪</span>
            معرف المواطن
          </h4>
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">معرف المواطن (اختياري)</label>
            <input
              type="text"
              value={citizenId}
              onChange={(e) => {
                setCitizenId(e.target.value);
                setShowCitizenIdSuggestions(e.target.value.trim().length >= 2);
              }}
              onFocus={() => {
                if (citizenId.trim().length >= 2) setShowCitizenIdSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowCitizenIdSuggestions(false), 200)}
              className={INPUT_CLASS}
              placeholder="اكتب حرفين أو أكثر لعرض اقتراحات معرفات سابقة"
              autoComplete="off"
            />
            {showCitizenIdSuggestions && citizenIdSuggestions.length > 0 && (
              <ul className="absolute top-full right-0 left-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                {citizenIdSuggestions.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 text-right text-sm text-[#1B1B1B] hover:bg-gray-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setCitizenId(id);
                        setShowCitizenIdSuggestions(false);
                      }}
                    >
                      {id}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* المرفقات */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-4 flex items-center gap-2 rounded border-r-4 border-[#0D9488] bg-gray-50 px-3 py-2 text-base font-bold text-[#1B1B1B]">
            <span className="text-lg">📎</span>
            المرفقات
          </h4>

          {/* بطاقات المرفقات المرفوعة */}
          {attachments.filter((a) => a.url).length > 0 && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {attachments
                .filter((a) => a.url)
                .map((att, i) => {
                  const origIdx = attachments.findIndex((a) => a === att);
                  return (
                    <div
                      key={origIdx}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                    >
                      <span className="text-2xl">📎</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1B1B1B]">
                          {att.name || "ملف مرفق"}
                        </p>
                        <p className="text-xs text-[#5a5a5a]" dir="ltr">
                          {att.size ? formatFileSize(att.size) : "—"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-2 text-[#0D9488] hover:bg-[#ccfbf1]"
                          title="عرض"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </a>
                        <button
                          type="button"
                          onClick={() => removeAttachment(origIdx)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          title="حذف"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* مؤشر التحميل */}
          {uploadingIndex !== null && (
            <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full animate-pulse bg-[#0D9488]"
                  style={{ width: "60%" }}
                />
              </div>
              <p className="mt-1 text-xs text-[#5a5a5a]">جاري رفع الملف…</p>
            </div>
          )}

          {/* منطقة السحب والإفلات / إضافة مرفق */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files).filter(
                (f) =>
                  /\.(pdf|jpe?g|png|webp)$/i.test(f.name) ||
                  f.type.startsWith("image/")
              );
              if (files.length === 0) return;
              setIsDragOver(false);
              const idx = attachments.findIndex((a) => !a.url);
              const slotIdx = idx >= 0 ? idx : attachments.length;
              if (idx < 0) setAttachments((prev) => [...prev, { url: "" }]);
              setTimeout(() => uploadFile(slotIdx, files[0]), 0);
            }}
            className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              isDragOver
                ? "border-[#0D9488] bg-[#0D9488]/10"
                : "border-gray-200 bg-white hover:border-[#0D9488] hover:bg-gray-50"
            }`}
          >
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";
                const idx = attachments.findIndex((a) => !a.url);
                const slotIdx = idx >= 0 ? idx : attachments.length;
                if (idx < 0) setAttachments((prev) => [...prev, { url: "" }]);
                setTimeout(() => uploadFile(slotIdx, file), 0);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={uploadingIndex !== null}
            />
            <p className="text-sm font-medium text-[#5a5a5a]">
              {isDragOver
                ? "أفلت الملف هنا"
                : "اسحب الملفات هنا أو انقر للاختيار"}
            </p>
            <p className="mt-1 text-xs text-[#5a5a5a]">
              صورة أو PDF (حتى 5 ميجابايت)
            </p>
          </div>
        </div>

        {/* وصف المعاملة */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <label className="mb-1 block text-sm font-medium text-[#1B1B1B]">وصف المعاملة</label>
          <textarea
            value={transactionDescription}
            onChange={(e) => setTransactionDescription(e.target.value)}
            className={`${INPUT_CLASS} min-h-[80px] resize-y`}
            placeholder="وصف أو تفاصيل إضافية عن المعاملة (اختياري)"
            rows={3}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </article>

        <div className="sticky bottom-0 right-0 left-0 z-10 -mx-4 -mb-6 rounded-t-lg border-t border-gray-200 bg-white px-4 py-4 shadow-[0_-1px_3px_rgba(0,0,0,0.06)] md:static md:mx-0 md:mb-0 md:rounded-t-none md:border-t-0 md:shadow-none">
          <div className="mx-auto flex max-w-2xl gap-3 sm:gap-4">
            <Link
              href="/reception/citizens"
              className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-center font-medium text-[#1B1B1B] hover:bg-gray-50"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1E6B3A] px-4 py-3 font-medium text-white hover:bg-[#175a2e] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{editId ? "جاري حفظ التعديلات…" : "جاري الحفظ…"}</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>{editId ? "حفظ التعديلات" : "حفظ المعاملة"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function ReceptionNewTransactionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0D9488] border-t-transparent" /></div>}>
      <ReceptionNewTransactionContent />
    </Suspense>
  );
}
