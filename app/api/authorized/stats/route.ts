import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDelegate } from "@/lib/api-auth";

/** إحصائيات المعاملات للمخول الحالي */
export async function GET() {
  const auth = await requireDelegate();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { delegateId } = auth;

  const [total, completed, byOffice] = await Promise.all([
    prisma.transaction.count({ where: { delegateId } }),
    prisma.transaction.count({ where: { delegateId, status: "DONE" } }),
    prisma.transaction.groupBy({
      by: ["officeId"],
      where: { delegateId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  const officeIds = byOffice.map((o) => o.officeId).filter(Boolean) as string[];
  const offices = officeIds.length
    ? await prisma.office.findMany({
        where: { id: { in: officeIds } },
        select: { id: true, name: true },
      })
    : [];
  const officeMap = Object.fromEntries(offices.map((o) => [o.id, o.name ?? "—"]));

  const distribution = byOffice.map((o) => ({
    officeId: o.officeId,
    officeName: o.officeId ? (officeMap[o.officeId] ?? "غير محدد") : "غير محدد",
    count: o._count.id,
  }));

  return NextResponse.json({
    total,
    completed,
    notCompleted: total - completed,
    officesCount: distribution.length,
    distribution,
    officeNames: [...new Set(distribution.map((d) => d.officeName).filter(Boolean))],
  });
}
