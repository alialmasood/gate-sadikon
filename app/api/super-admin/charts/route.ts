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
  } else if (period === "month") {
    gte.setDate(1);
  } else if (period === "year") {
    gte.setMonth(0, 1);
  } else if (period === "months:30") {
    gte.setDate(gte.getDate() - 30);
  } else if (period.startsWith("months:")) {
    const n = parseInt(period.replace("months:", ""), 10) || 1;
    gte.setMonth(gte.getMonth() - n);
  }
  return { gte, lte };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = request.nextUrl;
  const chart = searchParams.get("chart");
  const period = searchParams.get("period") || "month";
  const officeId = searchParams.get("officeId") || undefined;
  const { gte, lte } = getDateRange(period);
  const baseWhere = officeId ? { officeId } : {};

  if (chart === "timeline") {
    const days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(lte);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = await prisma.transaction.count({
        where: {
          ...baseWhere,
          createdAt: { gte: d, lt: next },
        },
      });
      days.push({
        date: d.toISOString().slice(0, 10),
        count,
      });
    }
    return NextResponse.json(days);
  }

  if (chart === "status") {
    const [pending, done, overdue] = await Promise.all([
      prisma.transaction.count({ where: { ...baseWhere, status: "PENDING" } }),
      prisma.transaction.count({ where: { ...baseWhere, status: "DONE" } }),
      prisma.transaction.count({ where: { ...baseWhere, status: "OVERDUE" } }),
    ]);
    return NextResponse.json([
      { name: "قيد التنفيذ", value: pending, fill: "#B08D57" },
      { name: "منجزة", value: done, fill: "#1E6B3A" },
      { name: "متأخرة", value: overdue, fill: "#dc2626" },
    ]);
  }

  if (chart === "activity") {
    const transactions = await prisma.transaction.findMany({
      where: baseWhere,
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        office: { select: { name: true } },
        delegate: { select: { name: true } },
      },
    });
    return NextResponse.json(
      transactions.map((t) => {
        const actionType = t.status === "DONE" ? "إنجاز" : t.status === "OVERDUE" ? "تحذير" : "إضافة";
        const executor = t.delegate?.name ?? t.office.name;
        return {
          id: t.id,
          citizenName: t.citizenName,
          officeName: t.office.name,
          status: t.status,
          actionType,
          executor,
          createdAt: t.createdAt,
          completedAt: t.completedAt,
          type: t.type,
        };
      })
    );
  }

  if (chart === "offices") {
    const grouped = await prisma.transaction.groupBy({
      by: ["officeId"],
      where: { status: "DONE" },
      _count: { id: true },
    });
    const officeIds = grouped.map((g) => g.officeId);
    const offices = await prisma.office.findMany({
      where: { id: { in: officeIds } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(offices.map((o) => [o.id, o.name]));
    const data = grouped
      .map((g) => ({ name: nameMap[g.officeId] || "مكتب", value: g._count.id }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    return NextResponse.json(data);
  }

  if (chart === "delegates") {
    const grouped = await prisma.transaction.groupBy({
      by: ["delegateId"],
      where: {
        status: "DONE",
        delegateId: { not: null },
        completedAt: { gte, lte },
      },
      _count: { id: true },
    });
    const delegateIds = grouped.map((g) => g.delegateId).filter(Boolean) as string[];
    const delegates = await prisma.delegate.findMany({
      where: { id: { in: delegateIds } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(delegates.map((d) => [d.id, d.name || d.id.slice(-6)]));
    const data = grouped
      .filter((g) => g.delegateId)
      .map((g) => ({
        name: nameMap[g.delegateId!] || `مخول`,
        value: g._count.id,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    return NextResponse.json(data);
  }

  if (chart === "ministries") {
    const ministries = await prisma.transaction.groupBy({
      by: ["officeId"],
      where: {
        createdAt: { gte, lte },
        office: { type: { contains: "وزارة", mode: "insensitive" } },
      },
      _count: { id: true },
    });
    const officeIds = ministries.map((m) => m.officeId);
    const officeNames = await prisma.office.findMany({
      where: { id: { in: officeIds } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(officeNames.map((o) => [o.id, o.name]));
    const data = ministries
      .map((m) => ({ name: nameMap[m.officeId] || "وزارة", value: m._count.id }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "chart غير صالح" }, { status: 400 });
}
