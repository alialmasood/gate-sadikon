import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير المكتب",
  RECEPTION: "استقبال",
  SORTING: "قسم الفرز",
  COORDINATOR: "تنسيق ومتابعة",
  DOCUMENTATION: "توثيق",
  USER: "مخول",
  AUDITOR: "مدقق",
  PARLIAMENT_MEMBER: "نائب",
};

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  const [users, delegates, delegateStats, totalTx, reachedSortingCount, delegatedCount, doneCount, urgentCount, cannotCompleteCount] = await Promise.all([
    prisma.user.findMany({
      where: { officeId, enabled: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.delegate.findMany({
      where: { officeId, status: "ACTIVE" },
      select: { id: true, name: true, userId: true },
    }),
    prisma.transaction.groupBy({
      by: ["delegateId"],
      where: { officeId, delegateId: { not: null } },
      _count: { id: true },
    }),
    prisma.transaction.count({ where: { officeId } }),
    prisma.transaction.count({ where: { officeId, reachedSorting: true } }),
    prisma.transaction.count({ where: { officeId, delegateId: { not: null } } }),
    prisma.transaction.count({ where: { officeId, status: "DONE" } }),
    prisma.transaction.count({ where: { officeId, urgent: true } }),
    prisma.transaction.count({ where: { officeId, cannotComplete: true } }),
  ]);

  const doneByDelegate = await prisma.transaction.groupBy({
    by: ["delegateId"],
    where: { officeId, delegateId: { not: null }, status: "DONE" },
    _count: { id: true },
  });

  const totalMap = Object.fromEntries(
    delegateStats.filter((g) => g.delegateId).map((g) => [g.delegateId!, g._count.id])
  );
  const doneMap = Object.fromEntries(
    doneByDelegate.filter((g) => g.delegateId).map((g) => [g.delegateId!, g._count.id])
  );

  const delegatesWithStats = delegates.map((d) => {
    const total = totalMap[d.id] ?? 0;
    const done = doneMap[d.id] ?? 0;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      id: d.id,
      name: d.name || "مخول",
      total,
      done,
      rate,
    };
  });

  const usersList = users.map((u) => ({
    id: u.id,
    name: u.name || u.email,
    email: u.email,
    role: u.role,
    roleLabel: ROLE_LABELS[u.role] ?? u.role,
  }));

  const sectionStats = [
    { section: "الاستقبال", summary: `استلم ${totalTx} معاملة` },
    { section: "قسم الفرز", summary: `وصلته ${reachedSortingCount} معاملة، عيّن ${delegatedCount} لمخولين، عاجل ${urgentCount}، لا يمكن إنجاز ${cannotCompleteCount}` },
    { section: "المخولون", summary: `أُنجز ${doneCount} معاملة` },
  ];

  return NextResponse.json({
    users: usersList,
    delegates: delegatesWithStats,
    sectionStats,
  });
}
