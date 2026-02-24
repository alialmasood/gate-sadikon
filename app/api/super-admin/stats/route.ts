import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // الفترة السابقة للمقارنة
  const monthStart = new Date(today);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  const lastMonthEnd = new Date(monthStart);
  lastMonthEnd.setMilliseconds(-1);

  const yesterdayStart = new Date(today);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(yesterdayStart);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const results = await Promise.all([
    prisma.user.count(),
    prisma.office.count(),
    prisma.transaction.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.delegate.count({ where: { status: "ACTIVE" } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: "DONE" } }),
    prisma.transaction.count({
      where: { office: { type: { contains: "وزارة", mode: "insensitive" } } },
    }),
    prisma.transaction.count({
      where: { office: { type: { contains: "دائرة", mode: "insensitive" } } },
    }),
    prisma.office.count({
      where: {
        OR: [
          { type: { contains: "قطاع خاص", mode: "insensitive" } },
          { type: { contains: "خاص", mode: "insensitive" } },
        ],
      },
    }),
    prisma.delegate.count({ where: { status: "ACTIVE" } }),
    prisma.transaction.count({
      where: { office: { type: { contains: "وزارة", mode: "insensitive" } } },
    }),
    prisma.transaction.count({
      where: { office: { type: { contains: "دائرة", mode: "insensitive" } } },
    }),
    prisma.office.count({
      where: {
        OR: [
          { type: { contains: "قطاع خاص", mode: "insensitive" } },
          { type: { contains: "خاص", mode: "insensitive" } },
        ],
      },
    }),
    prisma.user.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
    prisma.office.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
    prisma.delegate.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
    prisma.transaction.count({
      where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
    }),
    prisma.transaction.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.transaction.count({
      where: { status: "DONE", createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    }),
    0,
  ]);

  const [
    userCount,
    officeCount,
    transactionsToday,
    delegateCountActive,
    totalTransactions,
    doneTransactions,
    ministriesMostVisited,
    departmentsMostVisited,
    privateSectorCount,
    mostActiveDelegates,
    userCountPrev,
    officeCountPrev,
    delegateCountPrev,
    transactionsYesterday,
    totalTransactionsPrev,
    doneTransactionsPrev,
    _unused,
  ] = results;

  const delegateCount = delegateCountActive;
  const completionRate = totalTransactions > 0 ? Math.round((doneTransactions / totalTransactions) * 100) : 0;
  const overdueCount = await prisma.transaction.count({ where: { status: "OVERDUE" } });

  // متوسط زمن الإنجاز SLA (دقائق) للمعاملات المنجزة
  const completed = await prisma.transaction.findMany({
    where: { status: "DONE", completedAt: { not: null } },
    select: { createdAt: true, completedAt: true },
  });
  let avgCompletionMinutes: number | null = null;
  if (completed.length > 0) {
    const total = completed.reduce((sum, t) => {
      if (t.completedAt) {
        const diff = (t.completedAt.getTime() - t.createdAt.getTime()) / (1000 * 60);
        return sum + diff;
      }
      return sum;
    }, 0);
    avgCompletionMinutes = Math.round(total / completed.length);
  }

  // أكثر مكتب نشاطاً (حسب عدد المعاملات)
  const officeCounts = await prisma.transaction.groupBy({
    by: ["officeId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });
  let mostActiveOffice: string | null = null;
  if (officeCounts.length > 0) {
    const office = await prisma.office.findUnique({
      where: { id: officeCounts[0].officeId },
      select: { name: true },
    });
    mostActiveOffice = office?.name ?? null;
  }

  // أفضل 3 مكاتب هذا الشهر
  const topOfficesThisMonth = await prisma.transaction.groupBy({
    by: ["officeId"],
    where: { createdAt: { gte: monthStart, lte: tomorrow } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 3,
  });
  const topOfficeIds = topOfficesThisMonth.map((o) => o.officeId);
  const topOfficeNames = await prisma.office.findMany({
    where: { id: { in: topOfficeIds } },
    select: { id: true, name: true },
  });
  const top3OfficesThisMonth = topOfficesThisMonth.map((o) => ({
    name: topOfficeNames.find((n) => n.id === o.officeId)?.name ?? "مكتب",
    count: o._count.id,
  }));

  // تنبيهات إدارية
  const slaExceededTxns = await prisma.transaction.findMany({
    where: { status: "OVERDUE" },
    take: 10,
    include: { office: { select: { name: true } } },
  });
  const allOfficeIds = (await prisma.office.findMany({ select: { id: true } })).map((o) => o.id);
  const officesWithActivity = (
    await prisma.transaction.groupBy({
      by: ["officeId"],
      where: { createdAt: { gte: thirtyDaysAgo } },
    })
  ).map((g) => g.officeId);
  const inactiveOfficeIds = allOfficeIds.filter((id) => !officesWithActivity.includes(id));
  const inactiveOfficesList = await prisma.office.findMany({
    where: { id: { in: inactiveOfficeIds } },
    select: { id: true, name: true },
  });
  const inactiveUsersList = await prisma.user.findMany({
    where: { updatedAt: { lt: thirtyDaysAgo }, role: { not: "SUPER_ADMIN" } },
    take: 20,
    select: { id: true, name: true, email: true },
  });

  // مقارنة زمنية (نسبة التغيير)
  const completionRatePrev =
    totalTransactionsPrev > 0 ? Math.round((doneTransactionsPrev / totalTransactionsPrev) * 100) : 0;
  const completionRateDelta = completionRate - completionRatePrev;
  const overdueDelta = 0;
  const transactionsTodayDelta =
    transactionsYesterday > 0
      ? Math.round(((transactionsToday - transactionsYesterday) / transactionsYesterday) * 100)
      : transactionsToday > 0 ? 100 : 0;
  const userCountDelta = userCountPrev > 0 ? Math.round(((userCount - userCountPrev) / userCountPrev) * 100) : userCount > 0 ? 100 : 0;
  const officeCountDelta = officeCountPrev > 0 ? Math.round(((officeCount - officeCountPrev) / officeCountPrev) * 100) : officeCount > 0 ? 100 : 0;
  const delegateCountDelta = delegateCountPrev > 0 ? Math.round(((delegateCount - delegateCountPrev) / delegateCountPrev) * 100) : delegateCount > 0 ? 100 : 0;
  const totalTransactionsDelta =
    totalTransactionsPrev > 0
      ? Math.round(((totalTransactions - totalTransactionsPrev) / totalTransactionsPrev) * 100)
      : totalTransactions > 0 ? 100 : 0;

  // مؤشر أداء النظام: ممتاز / جيد / يحتاج تدخل
  let systemStatus: "excellent" | "good" | "needs_intervention" = "excellent";
  if (overdueCount > 5 || completionRate < 70 || (avgCompletionMinutes != null && avgCompletionMinutes > 10080)) {
    systemStatus = "needs_intervention";
  } else if (overdueCount > 0 || completionRate < 85) {
    systemStatus = "good";
  }

  return NextResponse.json({
    userCount,
    officeCount,
    totalTransactions,
    transactionsToday,
    delegateCount,
    completionRate,
    avgCompletionMinutes,
    overdueCount,
    mostActiveOffice,
    ministriesMostVisited,
    departmentsMostVisited,
    privateSectorCount,
    mostActiveDelegates,
    systemStatus,
    top3OfficesThisMonth,
    alerts: {
      slaExceeded: slaExceededTxns.map((t) => ({ id: t.id, citizenName: t.citizenName, officeName: t.office.name })),
      inactiveOffices: inactiveOfficesList.map((o) => ({ id: o.id, name: o.name })),
      inactiveUsers: inactiveUsersList.map((u) => ({ id: u.id, name: u.name ?? u.email })),
    },
    comparison: {
      userCountDelta,
      officeCountDelta,
      delegateCountDelta,
      totalTransactionsDelta,
      transactionsTodayDelta,
      overdueDelta,
      completionRateDelta,
    },
  });
}
