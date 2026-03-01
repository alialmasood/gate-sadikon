import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

function getDateRange(period: string): { gte: Date; lte: Date } {
  const now = new Date();
  const lte = new Date(now);
  lte.setHours(23, 59, 59, 999);
  const gte = new Date(now);
  gte.setHours(0, 0, 0, 0);
  if (period === "day" || period === "today") {
    // اليوم
  } else if (period === "week") {
    gte.setDate(gte.getDate() - 7);
  } else if (period === "months:30") {
    gte.setDate(gte.getDate() - 30);
  } else if (period.startsWith("months:")) {
    const n = parseInt(period.replace("months:", ""), 10) || 1;
    gte.setMonth(gte.getMonth() - n);
  } else {
    gte.setMonth(gte.getMonth() - 1);
  }
  return { gte, lte };
}

/**
 * إحصائيات وتحليلات المكاتب
 * - عدد المكاتب
 * - عدد المعاملات لكل مكتب (إجمالي، قيد التنفيذ، منجزة، متأخرة)
 * - مخططات نشاط المكاتب
 */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = request.nextUrl;
  const period = searchParams.get("period") || "months:30";
  const { gte, lte } = getDateRange(period);

  const [offices, officeCount, totalTransactions, pendingCount, doneCount, overdueCount, officesWithCounts, timelineRaw, statusByOffice] = await Promise.all([
    prisma.office.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, type: true, status: true } }),
    prisma.office.count(),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: "PENDING" } }),
    prisma.transaction.count({ where: { status: "DONE" } }),
    prisma.transaction.count({ where: { status: "OVERDUE" } }),
    prisma.transaction.groupBy({
      by: ["officeId"],
      _count: { id: true },
    }),
    Promise.all(
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date(lte);
        d.setDate(d.getDate() - (13 - i));
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        return prisma.transaction.groupBy({
          by: ["officeId"],
          where: { createdAt: { gte: d, lt: next } },
          _count: { id: true },
        });
      })
    ),
    prisma.transaction.groupBy({
      by: ["officeId", "status"],
      _count: { id: true },
    }),
  ]);

  const officeIds = offices.map((o) => o.id);
  const officeNameMap = Object.fromEntries(offices.map((o) => [o.id, o.name]));

  const byOffice = new Map<
    string,
    { total: number; pending: number; done: number; overdue: number }
  >();
  for (const g of officesWithCounts) {
    byOffice.set(g.officeId, { total: g._count.id, pending: 0, done: 0, overdue: 0 });
  }
  for (const g of statusByOffice) {
    const curr = byOffice.get(g.officeId);
    if (!curr) continue;
    if (g.status === "PENDING") curr.pending = g._count.id;
    else if (g.status === "DONE") curr.done = g._count.id;
    else if (g.status === "OVERDUE") curr.overdue = g._count.id;
  }

  const officesStats = offices.map((o) => {
    const s = byOffice.get(o.id) ?? { total: 0, pending: 0, done: 0, overdue: 0 };
    return {
      id: o.id,
      name: o.name,
      type: o.type,
      status: o.status,
      total: s.total,
      pending: s.pending,
      done: s.done,
      overdue: s.overdue,
    };
  });

  const officesChartData = officesStats
    .filter((o) => o.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
    .map((o) => ({ name: o.name, count: o.total }));

  const statusData = [
    { name: "قيد التنفيذ", value: pendingCount, fill: "#B08D57" },
    { name: "منجزة", value: doneCount, fill: "#1E6B3A" },
    { name: "متأخرة", value: overdueCount, fill: "#dc2626" },
  ];

  const dates: { date: string; count: number }[] = [];
  for (let i = 0; i <= 13; i++) {
    const d = new Date(lte);
    d.setDate(d.getDate() - (13 - i));
    d.setHours(0, 0, 0, 0);
    const dayData = timelineRaw[i] ?? [];
    const count = dayData.reduce((s, g) => s + g._count.id, 0);
    dates.push({ date: d.toISOString().slice(0, 10), count });
  }

  return NextResponse.json({
    officeCount,
    totalTransactions,
    pendingCount,
    doneCount,
    overdueCount,
    offices: officesStats,
    officesChartData,
    statusData,
    timelineData: dates,
  });
}
