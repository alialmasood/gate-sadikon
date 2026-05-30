import { prisma } from "@/lib/prisma";

export const TRANSACTION_TYPE_FIELD_KEY = "TRANSACTION_TYPE";

export type TransactionTypeOption = { id?: string; value: string; label: string; sortOrder?: number };

export const DEFAULT_TRANSACTION_TYPE_OPTIONS: TransactionTypeOption[] = [
  { value: "طلب", label: "طلب", sortOrder: 0 },
  { value: "طلب نقل خدمات بين وزارتين", label: "طلب نقل خدمات بين وزارتين", sortOrder: 1 },
  { value: "نقل خدمات بين تشكيلين في وزارة", label: "نقل خدمات بين تشكيلين في وزارة", sortOrder: 2 },
  { value: "طلب تخصيص قطعة ارض", label: "طلب تخصيص قطعة ارض", sortOrder: 3 },
  { value: "طلب تعيين", label: "طلب تعيين", sortOrder: 4 },
  { value: "طلب تشغيل", label: "طلب تشغيل", sortOrder: 5 },
  { value: "تظلم", label: "تظلم", sortOrder: 6 },
  { value: "مفاتحة", label: "مفاتحة", sortOrder: 7 },
  { value: "طلب رعاية اجتماعية", label: "طلب رعاية اجتماعية", sortOrder: 8 },
];

export function resolveTransactionTypeValue(label: string, explicitValue?: string): string {
  const trimmedLabel = label.trim();
  const trimmedValue = explicitValue?.trim();
  return trimmedValue || trimmedLabel;
}

export async function ensureDefaultTransactionTypeOptions(): Promise<void> {
  const count = await prisma.formFieldOption.count({
    where: { fieldKey: TRANSACTION_TYPE_FIELD_KEY },
  });
  if (count > 0) return;
  await prisma.formFieldOption.createMany({
    data: DEFAULT_TRANSACTION_TYPE_OPTIONS.map((o, i) => ({
      fieldKey: TRANSACTION_TYPE_FIELD_KEY,
      value: o.value,
      label: o.label,
      sortOrder: o.sortOrder ?? i,
      enabled: true,
    })),
  });
}

export async function listTransactionTypeOptions(includeDisabled = false): Promise<TransactionTypeOption[]> {
  await ensureDefaultTransactionTypeOptions();
  const rows = await prisma.formFieldOption.findMany({
    where: {
      fieldKey: TRANSACTION_TYPE_FIELD_KEY,
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

export async function isAllowedTransactionType(value: string): Promise<boolean> {
  const v = value.trim();
  if (!v) return false;
  await ensureDefaultTransactionTypeOptions();
  const found = await prisma.formFieldOption.findFirst({
    where: {
      fieldKey: TRANSACTION_TYPE_FIELD_KEY,
      enabled: true,
      OR: [{ value: v }, { label: v }],
    },
  });
  return !!found;
}
