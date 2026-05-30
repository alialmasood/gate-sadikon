export type CoordinatorIncomingTx = {
  id: string;
  urgent?: boolean;
  cannotComplete?: boolean;
  delegateName?: string | null;
  completedByAdmin?: boolean;
  reachedSorting?: boolean;
  assignedFromSection?: string | null;
  sourceSection?: string | null;
  officeName?: string | null;
  /** اسم صاحب الحساب — من إدارة المستخدمين */
  createdByName?: string | null;
  /** مكتب الارتباط لصاحب الحساب الذي سجّل المعاملة */
  createdByOfficeName?: string | null;
};

export type HandoffCategory = "urgent" | "delegated" | "cannotComplete";

export const HANDOFF_SOURCE_LABEL = "قسم الفرز";

/** مكتب التسجيل قبل الفرز (مكتب الارتباط لصاحب الحساب) */
export function getPreSortingOfficeLabel(t: CoordinatorIncomingTx): string {
  return (
    t.createdByOfficeName?.trim() ||
    t.officeName?.trim() ||
    "غير محدد"
  );
}

/** معاملة صادرة من قسم الفرز إلى مسار التنسيق */
export function isHandoffFromSorting(t: CoordinatorIncomingTx): boolean {
  if (!t.reachedSorting) return false;
  if (t.completedByAdmin) return false;
  if (t.cannotComplete) return true;
  if (t.delegateName) return t.assignedFromSection === "SORTING";
  return !!t.urgent;
}

export function getHandoffCategory(t: CoordinatorIncomingTx): HandoffCategory {
  if (t.cannotComplete) return "cannotComplete";
  if (t.delegateName) return "delegated";
  return "urgent";
}

export function getCoordinatorIncomingStatus(t: CoordinatorIncomingTx): {
  label: string;
  href: string;
} {
  const cat = getHandoffCategory(t);
  if (cat === "cannotComplete") {
    return { label: "لا يمكن إنجازها", href: "/coordinator/cannot-complete" };
  }
  if (cat === "delegated") {
    return { label: "إلى المخول", href: "/coordinator/delegates" };
  }
  return { label: "عاجلة", href: "/coordinator/urgent" };
}

export type CoordinatorHandoffStats = {
  total: number;
  urgent: number;
  delegated: number;
  cannotComplete: number;
  byPreSortingOffice: { label: string; count: number }[];
  byOffice: {
    officeName: string;
    total: number;
    urgent: number;
    delegated: number;
    cannotComplete: number;
    byPreSortingOffice: { label: string; count: number }[];
  }[];
};

export function computeCoordinatorHandoffStats(
  transactions: CoordinatorIncomingTx[]
): CoordinatorHandoffStats {
  const preSortingOfficeMap = new Map<string, number>();
  const officeMap = new Map<
    string,
    {
      officeName: string;
      total: number;
      urgent: number;
      delegated: number;
      cannotComplete: number;
      preSortingOffices: Map<string, number>;
    }
  >();

  let urgent = 0;
  let delegated = 0;
  let cannotComplete = 0;

  for (const t of transactions) {
    const cat = getHandoffCategory(t);
    if (cat === "urgent") urgent += 1;
    else if (cat === "delegated") delegated += 1;
    else cannotComplete += 1;

    const preSortingOffice = getPreSortingOfficeLabel(t);
    preSortingOfficeMap.set(
      preSortingOffice,
      (preSortingOfficeMap.get(preSortingOffice) || 0) + 1
    );

    const officeName = t.officeName?.trim() || "غير محدد";
    let office = officeMap.get(officeName);
    if (!office) {
      office = {
        officeName,
        total: 0,
        urgent: 0,
        delegated: 0,
        cannotComplete: 0,
        preSortingOffices: new Map(),
      };
      officeMap.set(officeName, office);
    }
    office.total += 1;
    if (cat === "urgent") office.urgent += 1;
    else if (cat === "delegated") office.delegated += 1;
    else office.cannotComplete += 1;
    office.preSortingOffices.set(
      preSortingOffice,
      (office.preSortingOffices.get(preSortingOffice) || 0) + 1
    );
  }

  const byPreSortingOffice = Array.from(preSortingOfficeMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ar"));

  const byOffice = Array.from(officeMap.values())
    .map((o) => ({
      officeName: o.officeName,
      total: o.total,
      urgent: o.urgent,
      delegated: o.delegated,
      cannotComplete: o.cannotComplete,
      byPreSortingOffice: Array.from(o.preSortingOffices.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.total - a.total || a.officeName.localeCompare(b.officeName, "ar"));

  return {
    total: transactions.length,
    urgent,
    delegated,
    cannotComplete,
    byPreSortingOffice,
    byOffice,
  };
}
