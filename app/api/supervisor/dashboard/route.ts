import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSupervision } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSupervision();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  const [
    officeCount,
    adminAccountsCount,
    parliamentMembersCount,
    totalTransactions,
    doneTransactions,
    pendingTransactions,
    cannotCompleteCount,
    delegateCount,
    formationsCount,
    subDeptsCount,
    transactionsToday,
    transactionsThisWeek,
    transactionsThisMonth,
  ] = await Promise.all([
    prisma.office.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({
      where: {
        role: "ADMIN",
        enabled: true,
      },
    }),
    prisma.user.count({ where: { role: "PARLIAMENT_MEMBER" } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: "DONE" } }),
    prisma.transaction.count({ where: { status: "PENDING" } }),
    prisma.transaction.count({ where: { cannotComplete: true } }),
    prisma.delegate
      .findMany({ where: { status: "ACTIVE", userId: { not: null } }, select: { userId: true } })
      .then(async (list) => {
        if (list.length === 0) return 0;
        const ids = [...new Set(list.map((d) => d.userId!))];
        const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
        const existing = new Set(users.map((u) => u.id));
        return list.filter((d) => existing.has(d.userId!)).length;
      }),
    prisma.formationSubDept
      .findMany({ where: { status: "ACTIVE" }, select: { formationId: true } })
      .then((subDepts) => new Set(subDepts.map((s) => s.formationId)).size),
    prisma.formationSubDept.count({ where: { status: "ACTIVE" } }),
    prisma.transaction.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.transaction.count({
      where: { createdAt: { gte: weekStart, lte: todayEnd } },
    }),
    prisma.transaction.count({
      where: { createdAt: { gte: monthStart } },
    }),
  ]);

  // مكاتب ومعاملاتها
  const officesGrouped = await prisma.transaction.groupBy({
    by: ["officeId"],
    _count: { id: true },
  });
  const officeIds = officesGrouped.map((g) => g.officeId);
  const offices = await prisma.office.findMany({
    where: { id: { in: officeIds } },
    select: { id: true, name: true },
  });
  const officeNameMap = Object.fromEntries(offices.map((o) => [o.id, o.name]));
  const officesChartData = officesGrouped
    .map((g) => ({ name: officeNameMap[g.officeId] || "مكتب", value: g._count.id }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  // مخولون وإنجازهم — أعلى المخولين من حيث المعاملات المنجزة (مستبعداً اليتامى)
  const delegatesGrouped = await prisma.transaction.groupBy({
    by: ["delegateId"],
    where: { delegateId: { not: null }, status: "DONE" },
    _count: { id: true },
  });
  const delegateIds = delegatesGrouped.map((g) => g.delegateId).filter(Boolean) as string[];
  const delegates =
    delegateIds.length > 0
      ? await prisma.delegate.findMany({
          where: { id: { in: delegateIds } },
          select: { id: true, name: true, userId: true },
        })
      : [];
  const delegateUserIds = delegates.map((d) => d.userId).filter((id): id is string => !!id);
  const delegateUsers =
    delegateUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: delegateUserIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userById = Object.fromEntries(delegateUsers.map((u) => [u.id, u]));
  const validDelegateIds = new Set(
    delegates.filter((d) => d.userId && userById[d.userId]).map((d) => d.id)
  );
  const delegateNameMap = Object.fromEntries(
    delegates
      .filter((d) => validDelegateIds.has(d.id))
      .map((d) => {
        const u = d.userId ? userById[d.userId] : null;
        return [d.id, d.name ?? u?.name ?? u?.email ?? "—"];
      })
  );
  const delegatesChartData = delegatesGrouped
    .filter((g) => g.delegateId && validDelegateIds.has(g.delegateId))
    .map((g) => ({
      name: delegateNameMap[g.delegateId!] ?? "مخول",
      value: g._count.id,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  // الجدول الزمني: اليوم، الأسبوع، الشهر
  const numDays = 30;
  const timelineGte = new Date(todayStart);
  timelineGte.setDate(timelineGte.getDate() - (numDays - 1));
  const dayMap = new Map<string, number>();
  for (let i = 0; i < numDays; i++) {
    const d = new Date(timelineGte);
    d.setDate(d.getDate() + i);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  const timelineTxns = await prisma.transaction.findMany({
    where: { createdAt: { gte: timelineGte, lte: todayEnd } },
    select: { createdAt: true },
  });
  for (const t of timelineTxns) {
    const key = t.createdAt.toISOString().slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const timelineData = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      label: new Date(date + "T12:00:00").toLocaleDateString("ar-IQ", {
        month: "short",
        day: "numeric",
        numberingSystem: "arab",
      }),
      count,
    }));

  return NextResponse.json({
    stats: {
      officeCount,
      adminAccountsCount,
      parliamentMembersCount,
      totalTransactions,
      doneTransactions,
      pendingTransactions,
      cannotCompleteCount,
      delegateCount,
      formationsCount,
      subDeptsCount,
      transactionsToday,
      transactionsThisWeek,
      transactionsThisMonth,
    },
    officesChartData,
    delegatesChartData,
    timelineData,
  });
}
