import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDelegate } from "@/lib/api-auth";

/** إرجاع المعاملات المعينة للمخول الحالي */
export async function GET(request: NextRequest) {
  const auth = await requireDelegate(request);
  if (auth.error) return NextResponse.json({ error: auth.error, transactions: [] }, { status: auth.status });
  const delegateId = auth.delegateId;
  if (!delegateId) return NextResponse.json({ error: "غير مصرح", transactions: [] }, { status: 403 });

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 100, 200);
  const statusFilter = request.nextUrl.searchParams.get("status") || undefined;
  const excludeCompleted = request.nextUrl.searchParams.get("excludeCompleted") === "true";

  const where: { delegateId: string; status?: string | { not: string } } = { delegateId };
  if (statusFilter === "DONE") where.status = "DONE";
  else if (excludeCompleted) where.status = { not: "DONE" };

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { office: { select: { name: true } } },
  });

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
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
      urgent: t.urgent,
      cannotComplete: t.cannotComplete,
      reachedSorting: t.reachedSorting,
      officeName: t.office?.name ?? null,
      assignedFromSection: t.assignedFromSection ?? null,
      delegateActions: t.delegateActions ?? [],
    })),
  });
}
