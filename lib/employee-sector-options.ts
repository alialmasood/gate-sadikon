import { prisma } from "@/lib/prisma";

export const EMPLOYEE_SECTOR_FIELD_KEY = "EMPLOYEE_SECTOR";

export type EmployeeSectorOption = { id?: string; value: string; label: string; sortOrder?: number };

export const DEFAULT_EMPLOYEE_SECTOR_OPTIONS: EmployeeSectorOption[] = [
  { value: "GOVERNMENT", label: "موظف حكومي", sortOrder: 0 },
  { value: "PRIVATE", label: "موظف قطاع خاص", sortOrder: 1 },
  { value: "NOT_LINKED", label: "موظف في جهة غير مرتبطة بوزارة", sortOrder: 2 },
  { value: "MIXED", label: "موظف في قطاع مشترك", sortOrder: 3 },
  { value: "OTHER", label: "موظف في جهة اخرى", sortOrder: 4 },
];

const LABEL_TO_VALUE: Record<string, string> = Object.fromEntries(
  DEFAULT_EMPLOYEE_SECTOR_OPTIONS.map((o) => [o.label, o.value])
);

export function suggestEmployeeSectorValue(label: string, existingValues: string[]): string {
  const trimmed = label.trim();
  if (LABEL_TO_VALUE[trimmed]) return LABEL_TO_VALUE[trimmed];
  const ascii = trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase()
    .slice(0, 32);
  let base = ascii || "CUSTOM";
  if (!/^[A-Z][A-Z0-9_]*$/.test(base)) base = "CUSTOM";
  let candidate = base;
  let n = 1;
  while (existingValues.includes(candidate)) {
    candidate = `${base}_${n++}`;
  }
  return candidate;
}

export async function ensureDefaultEmployeeSectorOptions(): Promise<void> {
  const count = await prisma.formFieldOption.count({
    where: { fieldKey: EMPLOYEE_SECTOR_FIELD_KEY },
  });
  if (count > 0) return;
  await prisma.formFieldOption.createMany({
    data: DEFAULT_EMPLOYEE_SECTOR_OPTIONS.map((o, i) => ({
      fieldKey: EMPLOYEE_SECTOR_FIELD_KEY,
      value: o.value,
      label: o.label,
      sortOrder: o.sortOrder ?? i,
      enabled: true,
    })),
  });
}

export async function listEmployeeSectorOptions(includeDisabled = false): Promise<EmployeeSectorOption[]> {
  await ensureDefaultEmployeeSectorOptions();
  const rows = await prisma.formFieldOption.findMany({
    where: {
      fieldKey: EMPLOYEE_SECTOR_FIELD_KEY,
      ...(includeDisabled ? {} : { enabled: true }),
    },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    value: r.value,
    label: r.label,
    sortOrder: r.sortOrder,
  }));
}

export async function isAllowedEmployeeSector(value: string): Promise<boolean> {
  if (!value.trim()) return false;
  await ensureDefaultEmployeeSectorOptions();
  const found = await prisma.formFieldOption.findFirst({
    where: {
      fieldKey: EMPLOYEE_SECTOR_FIELD_KEY,
      value: value.trim(),
      enabled: true,
    },
  });
  return !!found;
}
