import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { prismaOfficeIdFilter } from "@/lib/office-scope";

/** إرجاع المعاملات العاجلة لمكتب المدير */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeIds } = auth;

  const transactions = await prisma.transaction.findMany({
    where: { officeId: prismaOfficeIdFilter(officeIds), urgent: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      formation: { select: { name: true } },
      office: { select: { name: true } },
    },
  });

  return NextResponse.json(
    transactions.map((t) => ({
      id: t.id,
      citizenName: t.citizenName,
      transactionType: t.transactionType || t.type,
      serialNumber: t.serialNumber,
      formationName: t.formation?.name ?? null,
      officeName: t.office?.name ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      reachedSorting: t.reachedSorting,
    }))
  );
}
