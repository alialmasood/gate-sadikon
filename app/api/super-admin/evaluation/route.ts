import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const offices = await prisma.office.findMany({
    where: { status: "ACTIVE" },
    include: { _count: { select: { transactions: true } } },
  });
  const officePoints = offices
    .map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      points: o._count.transactions,
    }))
    .sort((a, b) => b.points - a.points);

  const delegateGroups = await prisma.transaction.groupBy({
    by: ["delegateId"],
    where: { delegateId: { not: null }, status: "DONE" },
    _count: { id: true },
  });
  const delegateIds = delegateGroups.map((g) => g.delegateId).filter(Boolean) as string[];
  const delegates = await prisma.delegate.findMany({
    where: { id: { in: delegateIds }, status: "ACTIVE" },
    select: { id: true, name: true, officeId: true },
  });
  const delegateMap = Object.fromEntries(delegates.map((d) => [d.id, d]));
  const officeMap = await prisma.office.findMany({ select: { id: true, name: true } }).then((list) => Object.fromEntries(list.map((o) => [o.id, o.name])));
  const delegatePoints = delegateGroups
    .filter((g) => g.delegateId)
    .map((g) => {
      const d = delegateMap[g.delegateId!];
      return {
        id: g.delegateId,
        name: d?.name ?? "مخول",
        officeName: d?.officeId ? officeMap[d.officeId] ?? null : null,
        points: g._count.id,
      };
    })
    .sort((a, b) => b.points - a.points);

  const delegatesWithZero = await prisma.delegate.findMany({
    where: { status: "ACTIVE", id: { notIn: delegateIds } },
    select: { id: true, name: true, officeId: true },
  });
  const allDelegatePoints = [
    ...delegatePoints,
    ...delegatesWithZero.map((d) => ({
      id: d.id,
      name: d.name ?? "مخول",
      officeName: d.officeId ? officeMap[d.officeId] ?? null : null,
      points: 0,
    })),
  ].sort((a, b) => b.points - a.points);

  const officeWithRank = officePoints.map((o, i) => ({ ...o, rank: i + 1 }));
  const delegateWithRank = allDelegatePoints.map((d, i) => ({ ...d, rank: i + 1 }));

  return NextResponse.json({
    offices: officeWithRank,
    delegates: delegateWithRank,
  });
}
