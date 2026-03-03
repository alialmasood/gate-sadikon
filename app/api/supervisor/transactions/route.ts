import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSupervision } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireSupervision();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const dateFrom = searchParams.get("dateFrom")?.trim();
  const dateTo = searchParams.get("dateTo")?.trim();
  const officeId = searchParams.get("officeId")?.trim();

  const transactionsList = await prisma.transaction.findMany({
    where: {
      ...(officeId ? { officeId } : {}),
      ...(q
        ? {
            OR: [
              { citizenName: { contains: q, mode: "insensitive" as const } },
              { serialNumber: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom + "T00:00:00.000Z") } : {}),
              ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      formation: { select: { name: true } },
      delegate: { select: { name: true } },
      office: { select: { id: true, name: true } },
    },
  });

  const subDeptIds = [...new Set(transactionsList.map((t) => t.subDeptId).filter(Boolean))] as string[];
  const subDepts =
    subDeptIds.length > 0
      ? await prisma.formationSubDept.findMany({ where: { id: { in: subDeptIds } }, select: { id: true, name: true } })
      : [];
  const subDeptMap = Object.fromEntries(subDepts.map((s) => [s.id, s.name]));

  const transactions = transactionsList.map((t) => ({
    id: t.id,
    officeId: t.officeId,
    officeName: t.office?.name ?? "—",
    citizenName: t.citizenName,
    citizenPhone: t.citizenPhone,
    serialNumber: t.serialNumber,
    status: t.status,
    formationName: t.formation?.name ?? null,
    subDeptName: (t.subDeptId && subDeptMap[t.subDeptId]) ?? null,
    delegateName: t.delegate?.name ?? null,
    reachedSorting: t.reachedSorting,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    assignedFromSection: t.assignedFromSection,
    sourceSection: t.sourceSection,
    transactionTitle: t.transactionTitle,
    transactionType: t.transactionType,
    urgent: t.urgent,
    completedByAdmin: t.completedByAdmin,
    cannotComplete: t.cannotComplete,
    cannotCompleteReason: t.cannotCompleteReason,
    attachments: t.attachments,
  }));

  return NextResponse.json({ transactions });
}
