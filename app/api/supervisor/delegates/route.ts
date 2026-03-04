import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSupervision } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSupervision();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const delegates = await prisma.delegate.findMany({
    where: { status: "ACTIVE" },
    include: {
      assignments: {
        include: {
          formation: { select: { name: true } },
          subDept: { select: { name: true } },
        },
      },
    },
  });

  const delegateUserIds = delegates.map((d) => d.userId).filter((id): id is string => !!id);
  const delegateUsers =
    delegateUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: delegateUserIds } },
          select: { id: true, serialNumber: true, email: true, name: true, ministry: true, department: true },
        })
      : [];
  const userById = Object.fromEntries(delegateUsers.map((u) => [u.id, u]));
  // استبعاد المخولين اليتامى (سجل Delegate موجود لكن المستخدم محذوف)
  const validDelegates = delegates.filter((d) => d.userId && userById[d.userId]);
  const userByDelegateId = Object.fromEntries(
    validDelegates.map((d) => [d.id, userById[d.userId!]])
  );

  const delegateIds = delegates.map((d) => d.id);
  const [pendingByDelegate, doneByDelegate] =
    delegateIds.length > 0
      ? await Promise.all([
          prisma.transaction.groupBy({
            by: ["delegateId"],
            where: { delegateId: { in: delegateIds }, status: "PENDING" },
            _count: { id: true },
          }),
          prisma.transaction.groupBy({
            by: ["delegateId"],
            where: { delegateId: { in: delegateIds }, status: "DONE" },
            _count: { id: true },
          }),
        ])
      : [[], []];

  const pendingMap = Object.fromEntries(
    (pendingByDelegate as { delegateId: string; _count: { id: number } }[]).map((x) => [x.delegateId, x._count.id])
  );
  const doneMap = Object.fromEntries(
    (doneByDelegate as { delegateId: string; _count: { id: number } }[]).map((x) => [x.delegateId, x._count.id])
  );

  const list = validDelegates.map((d) => {
    const u = userByDelegateId[d.id];
    return {
      id: d.id,
      name: d.name ?? u?.name ?? u?.email ?? "—",
      serialNumber: u?.serialNumber ?? null,
      email: u?.email ?? null,
      ministry: u?.ministry ?? null,
      department: u?.department ?? null,
      assignments: d.assignments.map((a) => ({
        formationName: a.formation.name,
        subDeptName: a.subDept?.name ?? null,
      })),
      pendingCount: pendingMap[d.id] ?? 0,
      doneCount: doneMap[d.id] ?? 0,
    };
  });

  return NextResponse.json({ delegates: list });
}
