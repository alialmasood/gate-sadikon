import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

const secret = process.env.NEXTAUTH_SECRET;

/**
 * إرجاع المعاملات لمكتب المستخدم الحالي
 * متاح لـ ADMIN و RECEPTION — يستخدم التوكن مباشرة لتفادي مشاكل الجلسة
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token) {
    return NextResponse.json({ error: "غير مصرح", transactions: [] }, { status: 403 });
  }
  const role = token.role as string | undefined;
  const officeId = token.officeId as string | undefined;
  if (role !== "ADMIN" && role !== "RECEPTION" && role !== "SORTING" && role !== "COORDINATOR") {
    return NextResponse.json({ error: "غير مصرح", transactions: [] }, { status: 403 });
  }
  if (!officeId) {
    return NextResponse.json({ transactions: [], overdueCount: 0 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const urgentOnly = searchParams.get("urgent") === "true";
  const cannotCompleteOnly = searchParams.get("cannotComplete") === "true";
  const completedByAdminOnly = searchParams.get("completedByAdmin") === "true";
  const dateFrom = searchParams.get("dateFrom")?.trim();
  const dateTo = searchParams.get("dateTo")?.trim();
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 3000);

  const where: Record<string, unknown> = { officeId };
  if (status) where.status = status;
  if (urgentOnly) where.urgent = true;
  if (cannotCompleteOnly) where.cannotComplete = true;
  if (completedByAdminOnly) where.completedByAdmin = true;

  if (dateFrom || dateTo) {
    const gte = dateFrom ? new Date(dateFrom + "T00:00:00") : undefined;
    const lte = dateTo ? new Date(dateTo + "T23:59:59.999") : undefined;
    const dateRange: { gte?: Date; lte?: Date } = {};
    if (gte) dateRange.gte = gte;
    if (lte) dateRange.lte = lte;
    where.OR = [
      { submissionDate: { not: null, ...dateRange } },
      { submissionDate: null, createdAt: dateRange },
    ];
  }

  const [transactions, overdueCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        delegate: { select: { name: true } },
        formation: { select: { name: true } },
        office: { select: { name: true } },
      },
    }),
    prisma.transaction.count({ where: { officeId, status: "OVERDUE" } }),
  ]);

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      citizenId: t.citizenId,
      citizenName: t.citizenName,
      citizenPhone: t.citizenPhone,
      citizenAddress: t.citizenAddress,
      citizenIsEmployee: t.citizenIsEmployee,
      citizenEmployeeSector: t.citizenEmployeeSector,
      citizenMinistry: t.citizenMinistry,
      citizenDepartment: t.citizenDepartment,
      citizenOrganization: t.citizenOrganization,
      status: t.status,
      type: t.type,
      transactionType: t.transactionType,
      transactionTitle: t.transactionTitle,
      serialNumber: t.serialNumber,
      submissionDate: t.submissionDate,
      attachments: t.attachments,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      delegateName: t.delegate?.name ?? null,
      urgent: t.urgent,
      cannotComplete: t.cannotComplete,
      cannotCompleteReason: t.cannotCompleteReason,
      reachedSorting: t.reachedSorting,
      formationName: t.formation?.name ?? null,
      officeName: t.office?.name ?? null,
      updatedAt: t.updatedAt,
      completedByAdmin: t.completedByAdmin ?? false,
      delegateActions: t.delegateActions ?? [],
    })),
    overdueCount,
  });
}
