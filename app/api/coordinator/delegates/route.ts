import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoordinatorOrSuperAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** حسابات المخولين (DEL-) كما تُنشأ من لوحة السوبر أدمن، مع عدد المعاملات والمنجز والتكليفات */
export async function GET() {
  const auth = await requireCoordinatorOrSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const users = await prisma.user.findMany({
    where: { serialNumber: { startsWith: "DEL-" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      ministry: true,
      department: true,
      serialNumber: true,
      enabled: true,
      assignmentDate: true,
    },
  });

  const userIds = users.map((u) => u.id);
  const delegateRows =
    userIds.length === 0
      ? []
      : await prisma.delegate.findMany({
          where: { userId: { in: userIds } },
          select: {
            id: true,
            userId: true,
            assignments: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                formation: { select: { name: true } },
                subDept: { select: { name: true } },
              },
            },
          },
        });

  const delegateIds = delegateRows.map((d) => d.id);
  const [totals, completed] =
    delegateIds.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.transaction.groupBy({
            by: ["delegateId"],
            where: { delegateId: { in: delegateIds } },
            _count: { id: true },
          }),
          prisma.transaction.groupBy({
            by: ["delegateId"],
            where: {
              delegateId: { in: delegateIds },
              OR: [{ status: "DONE" }, { completedByAdmin: true }],
            },
            _count: { id: true },
          }),
        ]);

  const totalByDelegate = new Map(totals.map((c) => [c.delegateId, c._count.id]));
  const doneByDelegate = new Map(completed.map((c) => [c.delegateId, c._count.id]));
  const delegateByUser = new Map(delegateRows.filter((d) => d.userId).map((d) => [d.userId as string, d]));

  return NextResponse.json(
    users.map((u) => {
      const delegate = delegateByUser.get(u.id);
      const transactionCount = delegate ? totalByDelegate.get(delegate.id) ?? 0 : 0;
      const completedCount = delegate ? doneByDelegate.get(delegate.id) ?? 0 : 0;
      return {
        ...u,
        delegateId: delegate?.id ?? null,
        transactionCount,
        completedCount,
        openCount: Math.max(0, transactionCount - completedCount),
        assignments: (delegate?.assignments ?? []).map((a) => ({
          id: a.id,
          formationName: a.formation.name,
          subDeptName: a.subDept?.name ?? null,
        })),
      };
    })
  );
}
