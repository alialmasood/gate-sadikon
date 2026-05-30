import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const OFFICE_TYPE_CENTRAL = "CENTRAL";
export const OFFICE_TYPE_BRANCH = "BRANCH";

export const OFFICE_TYPE_LABELS: Record<string, string> = {
  [OFFICE_TYPE_CENTRAL]: "مركزي",
  [OFFICE_TYPE_BRANCH]: "فرعي",
};

const CENTRAL_DB_VALUES = [OFFICE_TYPE_CENTRAL, "مركزي", "مركزى"];
const BRANCH_DB_VALUES = [OFFICE_TYPE_BRANCH, "فرعي"];

export function normalizeOfficeType(type: string | null | undefined): string | null {
  if (!type || !type.trim()) return null;
  const t = type.trim();
  const upper = t.toUpperCase();
  if (CENTRAL_DB_VALUES.some((v) => v.toUpperCase() === upper || v === t)) return OFFICE_TYPE_CENTRAL;
  if (BRANCH_DB_VALUES.some((v) => v.toUpperCase() === upper || v === t)) return OFFICE_TYPE_BRANCH;
  return upper;
}

export function getOfficeTypeLabel(type: string | null | undefined): string {
  const n = normalizeOfficeType(type);
  if (!n) return "—";
  return OFFICE_TYPE_LABELS[n] ?? type ?? "—";
}

export function isCentralOfficeType(type: string | null | undefined): boolean {
  return normalizeOfficeType(type) === OFFICE_TYPE_CENTRAL;
}

export type OfficeScope = {
  officeId: string;
  officeType: string;
  isCentral: boolean;
  officeIds: string[];
  officeName: string;
};

export async function resolveOfficeScope(officeId: string): Promise<OfficeScope | null> {
  const office = await prisma.office.findUnique({
    where: { id: officeId },
    select: { id: true, type: true, name: true },
  });
  if (!office) return null;

  const officeType = normalizeOfficeType(office.type) ?? OFFICE_TYPE_BRANCH;

  if (officeType === OFFICE_TYPE_CENTRAL) {
    const allOffices = await prisma.office.findMany({
      select: { id: true, type: true },
    });
    const officeIds = allOffices
      .filter((o) => o.id === office.id || !isCentralOfficeType(o.type))
      .map((o) => o.id);

    return {
      officeId: office.id,
      officeType: OFFICE_TYPE_CENTRAL,
      isCentral: true,
      officeIds,
      officeName: office.name,
    };
  }

  return {
    officeId: office.id,
    officeType: OFFICE_TYPE_BRANCH,
    isCentral: false,
    officeIds: [office.id],
    officeName: office.name,
  };
}

/** فلتر Prisma لمعاملات/مستخدمين ضمن نطاق المكتب */
export function prismaOfficeIdFilter(officeIds: string[]): Prisma.TransactionWhereInput["officeId"] {
  if (officeIds.length === 1) return officeIds[0];
  return { in: officeIds };
}

export function prismaUserOfficeIdFilter(officeIds: string[]): Prisma.UserWhereInput["officeId"] {
  if (officeIds.length === 1) return officeIds[0];
  return { in: officeIds };
}

export function prismaDelegateOfficeIdFilter(officeIds: string[]): Prisma.DelegateWhereInput["officeId"] {
  if (officeIds.length === 1) return officeIds[0];
  return { in: officeIds };
}

/** شروط الوصول لمعاملة ضمن نطاق مكتب المستخدم */
export function transactionAccessWhere(
  id: string,
  officeIds: string[],
  role: string,
  userId?: string
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {
    id,
    officeId: prismaOfficeIdFilter(officeIds),
  };
  if (role === "RECEPTION" && userId) where.createdByUserId = userId;
  return where;
}

export async function assertCanSetOfficeType(
  newType: string,
  officeId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeOfficeType(newType);
  if (!normalized || (normalized !== OFFICE_TYPE_CENTRAL && normalized !== OFFICE_TYPE_BRANCH)) {
    return { ok: false, error: "نوع المكتب يجب أن يكون مركزي أو فرعي" };
  }
  if (normalized === OFFICE_TYPE_CENTRAL) {
    const existingCentral = await prisma.office.findFirst({
      where: {
        OR: CENTRAL_DB_VALUES.map((v) => ({ type: v })),
        ...(officeId ? { id: { not: officeId } } : {}),
      },
      select: { id: true, name: true },
    });
    if (existingCentral) {
      return {
        ok: false,
        error: `يوجد مكتب مركزي بالفعل («${existingCentral.name}»). يُسمح بمكتب مركزي واحد فقط.`,
      };
    }
  }
  return { ok: true };
}
