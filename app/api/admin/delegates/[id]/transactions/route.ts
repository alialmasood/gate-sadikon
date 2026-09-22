import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminOrAdmin } from "@/lib/api-auth";
import { prismaOfficeIdFilter, resolveOfficeScope } from "@/lib/office-scope";
import { getTransactionStageLabel, latestTransferAction } from "@/lib/transaction-stage";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/** معاملات مخول واحد (معرّف حساب المستخدم) ضمن نطاق مكتب المدير */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminOrAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: userId } = await params;

  const officeWhere: Prisma.TransactionWhereInput = {};
  if (auth.role === "ADMIN") {
    if (!auth.officeId) return NextResponse.json({ error: "الحساب غير مرتبط بمكتب" }, { status: 403 });
    const scope = await resolveOfficeScope(auth.officeId);
    if (!scope) return NextResponse.json({ error: "المكتب غير موجود" }, { status: 403 });
    officeWhere.officeId = prismaOfficeIdFilter(scope.officeIds);
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, serialNumber: { startsWith: "DEL-" } },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "المخول غير موجود" }, { status: 404 });

  const delegate = await prisma.delegate.findFirst({
    where: { userId: user.id },
    select: { id: true, name: true },
  });
  if (!delegate) return NextResponse.json({ delegateId: null, transactions: [] });

  const rows = await prisma.transaction.findMany({
    where: { delegateId: delegate.id, ...officeWhere },
    orderBy: { updatedAt: "desc" },
    include: {
      office: { select: { name: true } },
      formation: { select: { name: true } },
    },
  });

  return NextResponse.json({
    delegateId: delegate.id,
    transactions: rows.map((t) => {
      const transfer = latestTransferAction(t.delegateActions);
      return {
        id: t.id,
        serialNumber: t.serialNumber,
        citizenName: t.citizenName,
        transactionType: t.transactionType,
        type: t.type,
        status: t.status,
        officeName: t.office?.name ?? null,
        formationName: t.formation?.name ?? null,
        stageLabel: getTransactionStageLabel(t),
        urgent: t.urgent,
        cannotComplete: t.cannotComplete,
        updatedAt: t.updatedAt,
        transferred: !!transfer,
        transferredFromDelegateName: transfer?.fromDelegateName ?? null,
      };
    }),
  });
}
