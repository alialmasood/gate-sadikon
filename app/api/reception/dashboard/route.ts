import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrReceptionOrSorting } from "@/lib/api-auth";

function getStartOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getStartOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getStartOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET() {
  const auth = await requireAdminOrReceptionOrSorting();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  if (!officeId) {
    return NextResponse.json({
      totalCitizens: 0,
      totalTransactions: 0,
      transactionsToday: 0,
      transactionsThisWeek: 0,
      transactionsThisMonth: 0,
      typeBreakdown: [],
      statusBreakdown: { pending: 0, done: 0, overdue: 0 },
      typeByDay: [],
      typeByWeek: [],
    });
  }

  const now = new Date();
  const todayStart = getStartOfDay(now);
  const weekStart = getStartOfWeek(now);
  const monthStart = getStartOfMonth(now);

  const [uniqueCitizens, totalTx, todayTx, weekTx, monthTx, allForTypes, typeByDayRaw] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["citizenName"],
      where: {
        officeId,
        citizenName: { not: null },
      },
      _count: { id: true },
    }),
    prisma.transaction.count({ where: { officeId } }),
    prisma.transaction.count({
      where: {
        officeId,
        OR: [
          { createdAt: { gte: todayStart } },
          { submissionDate: { gte: todayStart } },
        ],
      },
    }),
    prisma.transaction.count({
      where: {
        officeId,
        OR: [
          { createdAt: { gte: weekStart } },
          { submissionDate: { gte: weekStart } },
        ],
      },
    }),
    prisma.transaction.count({
      where: {
        officeId,
        OR: [
          { createdAt: { gte: monthStart } },
          { submissionDate: { gte: monthStart } },
        ],
      },
    }),
    prisma.transaction.findMany({
      where: { officeId },
      select: { transactionType: true, type: true, status: true, createdAt: true, submissionDate: true },
    }),
    prisma.transaction.findMany({
      where: { officeId },
      select: { transactionType: true, type: true, createdAt: true, submissionDate: true },
    }),
  ]);

  const totalCitizens = uniqueCitizens.filter((g) => (g.citizenName ?? "").trim() !== "").length;

  const typeMap: Record<string, number> = {};
  allForTypes.forEach((t) => {
    const type = t.transactionType || t.type || "غير محدد";
    typeMap[type] = (typeMap[type] || 0) + 1;
  });
  const typeBreakdown = Object.entries(typeMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const statusBreakdown = {
    pending: allForTypes.filter((t) => t.status === "PENDING").length,
    done: allForTypes.filter((t) => t.status === "DONE").length,
    overdue: allForTypes.filter((t) => t.status === "OVERDUE").length,
  };

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    const dayStart = getStartOfDay(d);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return dayStart.toISOString().slice(0, 10);
  });

  const typeByDay: { date: string; [key: string]: string | number }[] = last30Days.map((dateStr) => {
    const dayStart = new Date(dateStr + "T00:00:00");
    const dayEnd = new Date(dateStr + "T23:59:59.999");
    const row: { date: string; [key: string]: string | number } = { date: dateStr };
    typeByDayRaw
      .filter((t) => {
        const d = t.submissionDate || t.createdAt;
        if (!d) return false;
        const dt = new Date(d);
        return dt >= dayStart && dt <= dayEnd;
      })
      .forEach((t) => {
        const type = t.transactionType || t.type || "غير محدد";
        row[type] = ((row[type] as number) || 0) + 1;
      });
    const total = Object.keys(row)
      .filter((k) => k !== "date")
      .reduce((sum, k) => sum + (row[k] as number), 0);
    row["المجموع"] = total;
    return row;
  });

  const last4Weeks = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 7 * (3 - i));
    return getStartOfWeek(d).toISOString().slice(0, 10);
  });

  const typeByWeek = last4Weeks.map((weekStartStr) => {
    const weekStart = new Date(weekStartStr + "T00:00:00");
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const label = new Intl.DateTimeFormat("ar-IQ", {
      month: "short",
      day: "numeric",
      numberingSystem: "arab",
    }).format(weekStart);
    const row: { period: string; [key: string]: string | number } = { period: label };
    typeByDayRaw
      .filter((t) => {
        const d = t.submissionDate || t.createdAt;
        if (!d) return false;
        const dt = new Date(d);
        return dt >= weekStart && dt < weekEnd;
      })
      .forEach((t) => {
        const type = t.transactionType || t.type || "غير محدد";
        row[type] = ((row[type] as number) || 0) + 1;
      });
    const total = Object.keys(row)
      .filter((k) => k !== "period")
      .reduce((sum, k) => sum + (row[k] as number), 0);
    row["المجموع"] = total;
    return row;
  });

  return NextResponse.json({
    totalCitizens,
    totalTransactions: totalTx,
    transactionsToday: todayTx,
    transactionsThisWeek: weekTx,
    transactionsThisMonth: monthTx,
    typeBreakdown,
    statusBreakdown,
    typeByDay,
    typeByWeek,
  });
}
