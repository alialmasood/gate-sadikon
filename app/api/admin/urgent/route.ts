import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

/** إرجاع المعاملات العاجلة لمكتب المدير */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  const transactions = await prisma.transaction.findMany({
    where: { officeId, urgent: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      formation: { select: { name: true } },
    },
  });

  return NextResponse.json(
    transactions.map((t) => ({
      id: t.id,
      citizenName: t.citizenName,
      transactionType: t.transactionType || t.type,
      serialNumber: t.serialNumber,
      formationName: t.formation?.name ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      reachedSorting: t.reachedSorting,
    }))
  );
}
