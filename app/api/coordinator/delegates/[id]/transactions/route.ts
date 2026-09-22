import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoordinatorOrSuperAdmin } from "@/lib/api-auth";
import { formatElapsedSince, getTransactionStageLabel, isTransactionCompleted } from "@/lib/transaction-stage";

export const dynamic = "force-dynamic";

/** معاملات مخول واحد لمتابعة قسم التنسيق: المرحلة، الإنجاز، والمدة منذ الاستلام */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCoordinatorOrSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: userId } = await params;
  const user = await prisma.user.findFirst({
    where: { id: userId, serialNumber: { startsWith: "DEL-" } },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "المخول غير موجود" }, { status: 404 });

  const delegate = await prisma.delegate.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!delegate) return NextResponse.json({ transactions: [] });

  const rows = await prisma.transaction.findMany({
    where: { delegateId: delegate.id },
    orderBy: { updatedAt: "desc" },
    include: {
      office: { select: { name: true } },
      formation: { select: { name: true } },
    },
  });

  return NextResponse.json({
    transactions: rows.map((t) => {
      const completed = isTransactionCompleted(t);
      const receivedAt = t.createdAt;
      const finishedAt = completed ? t.completedAt ?? t.updatedAt : null;
      return {
        id: t.id,
        serialNumber: t.serialNumber,
        citizenName: t.citizenName,
        citizenPhone: t.citizenPhone,
        transactionType: t.transactionType,
        type: t.type,
        status: t.status,
        officeName: t.office?.name ?? null,
        formationName: t.formation?.name ?? null,
        stageLabel: getTransactionStageLabel(t),
        completed,
        completedAt: t.completedAt,
        receivedAt,
        elapsedLabel: formatElapsedSince(receivedAt, finishedAt),
        elapsedNote: completed ? "من الاستلام حتى الإنجاز" : "منذ استلام المعاملة",
        urgent: t.urgent,
        cannotComplete: t.cannotComplete,
      };
    }),
  });
}
