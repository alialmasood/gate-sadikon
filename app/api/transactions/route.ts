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
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 200);

  const where: { officeId: string; status?: string; urgent?: boolean } = { officeId };
  if (status) where.status = status;
  if (urgentOnly) where.urgent = true;

  const [transactions, overdueCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { delegate: { select: { name: true } } },
    }),
    prisma.transaction.count({ where: { officeId, status: "OVERDUE" } }),
  ]);

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
      delegateName: t.delegate?.name ?? null,
      urgent: t.urgent,
      cannotComplete: t.cannotComplete,
      reachedSorting: t.reachedSorting,
    })),
    overdueCount,
  });
}
