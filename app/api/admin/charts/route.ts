import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

function getDateRange(period: string): { gte: Date; lte: Date } {
  const now = new Date();
  const lte = new Date(now);
  lte.setHours(23, 59, 59, 999);
  const gte = new Date(now);
  gte.setHours(0, 0, 0, 0);
  if (period === "day" || period === "today") {
  } else if (period === "week") {
    gte.setDate(gte.getDate() - 7);
  } else if (period === "month") {
    gte.setDate(1);
  } else if (period === "months:30") {
    gte.setDate(gte.getDate() - 30);
  } else {
    gte.setDate(gte.getDate() - 30);
  }
  return { gte, lte };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  const { searchParams } = request.nextUrl;
  const chart = searchParams.get("chart");
  const period = searchParams.get("period") || "months:30";

  const baseWhere = { officeId };

  if (chart === "timeline") {
    const { gte, lte } = getDateRange(period);
    const days: { date: string; count: number }[] = [];
    const diffDays = Math.ceil((lte.getTime() - gte.getTime()) / (1000 * 60 * 60 * 24));
    for (let i = Math.min(diffDays - 1, 29); i >= 0; i--) {
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
      days.push({ date: d.toISOString().slice(0, 10), count });
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
      take: 15,
      include: { delegate: { select: { name: true } } },
    });
    return NextResponse.json(
      transactions.map((t) => ({
        id: t.id,
        citizenName: t.citizenName,
        status: t.status,
        actionType: t.status === "DONE" ? "إنجاز" : t.status === "OVERDUE" ? "تحذير" : "إضافة",
        executor: t.delegate?.name ?? "—",
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      }))
    );
  }

  return NextResponse.json({ error: "chart غير صالح" }, { status: 400 });
}
