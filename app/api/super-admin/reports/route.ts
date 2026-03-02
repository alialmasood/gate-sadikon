import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
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

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = request.nextUrl;
  const period = searchParams.get("period") || "months:30";
  const officeId = searchParams.get("officeId") || undefined;
  const { gte, lte } = getDateRange(period);
  const baseWhere = officeId ? { officeId } : {};

  const officeManagerIds = (
    await prisma.office.findMany({ where: { managerId: { not: null } }, select: { managerId: true } })
  )
    .map((o) => o.managerId)
    .filter((id): id is string => id != null);

  const [
    timelineData,
    statusData,
    officesData,
    delegatesData,
    transactionTypes,
    overdueList,
    inactiveOffices,
    sourceSectionBreakdown,
    accountsSummary,
    ministriesSummary,
  ] = await Promise.all([
    (async () => {
      const numDays = period === "day" ? 1 : period === "week" ? 7 : 30;
      const dayMap = new Map<string, number>();
      for (let i = 0; i < numDays; i++) {
        const d = new Date(lte);
        d.setDate(d.getDate() - (numDays - 1 - i));
        const key = d.toISOString().slice(0, 10);
        dayMap.set(key, 0);
      }
      const transactions = await prisma.transaction.findMany({
        where: { ...baseWhere, createdAt: { gte, lte } },
        select: { createdAt: true },
      });
      for (const t of transactions) {
        const key = t.createdAt.toISOString().slice(0, 10);
        if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      }
      return Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));
    })(),
    Promise.all([
      prisma.transaction.count({ where: { ...baseWhere, createdAt: { gte, lte }, status: "PENDING" } }),
      prisma.transaction.count({ where: { ...baseWhere, createdAt: { gte, lte }, status: "DONE" } }),
      prisma.transaction.count({ where: { ...baseWhere, createdAt: { gte, lte }, status: "OVERDUE" } }),
    ]).then(([pending, done, overdue]) => [
      { name: "قيد التنفيذ", value: pending, fill: "#B08D57" },
      { name: "منجزة", value: done, fill: "#1E6B3A" },
      { name: "متأخرة", value: overdue, fill: "#dc2626" },
    ]),
    prisma.transaction
      .groupBy({
        by: ["officeId"],
        where: { ...baseWhere, status: "DONE", createdAt: { gte, lte } },
        _count: { id: true },
      })
      .then(async (rows) => {
        const officeIds = rows.map((r) => r.officeId);
        const offices = await prisma.office.findMany({
          where: { id: { in: officeIds } },
          select: { id: true, name: true },
        });
        const nameMap = Object.fromEntries(offices.map((o) => [o.id, o.name]));
        return rows
          .map((r) => ({ name: nameMap[r.officeId] || "مكتب", value: r._count.id }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
      }),
    prisma.transaction
      .groupBy({
        by: ["delegateId"],
        where: { ...baseWhere, status: "DONE", delegateId: { not: null }, completedAt: { gte, lte } },
        _count: { id: true },
      })
      .then(async (rows) => {
        const delegateIds = rows.map((r) => r.delegateId).filter(Boolean) as string[];
        const delegates = await prisma.delegate.findMany({
          where: { id: { in: delegateIds } },
          select: { id: true, name: true },
        });
        const nameMap = Object.fromEntries(delegates.map((d) => [d.id, d.name || d.id.slice(-6)]));
        return rows
          .filter((r) => r.delegateId)
          .map((r) => ({ name: nameMap[r.delegateId!] || "مخول", value: r._count.id }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
      }),
    prisma.transaction
      .groupBy({
        by: ["transactionType"],
        where: { ...baseWhere, createdAt: { gte, lte } },
        _count: { id: true },
      })
      .then((rows) =>
        rows
          .map((r) => ({ name: r.transactionType || "غير محدد", value: r._count.id }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
      ),
    prisma.transaction.findMany({
      where: { status: "OVERDUE" },
      take: 15,
      include: { office: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    (async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const allOfficeIds = (await prisma.office.findMany({ select: { id: true } })).map((o) => o.id);
      const activeOfficeIds = (
        await prisma.transaction.groupBy({
          by: ["officeId"],
          where: { createdAt: { gte: thirtyDaysAgo } },
        })
      ).map((g) => g.officeId);
      const inactive = allOfficeIds.filter((id) => !activeOfficeIds.includes(id));
      if (inactive.length === 0) return [];
      return prisma.office.findMany({
        where: { id: { in: inactive } },
        select: { id: true, name: true },
      });
    })(),
    prisma.transaction
      .groupBy({
        by: ["sourceSection"],
        where: { ...baseWhere, createdAt: { gte, lte }, sourceSection: { not: null } },
        _count: { id: true },
      })
      .then((rows) =>
        rows
          .filter((r) => r.sourceSection)
          .map((r) => ({ name: r.sourceSection!, value: r._count.id }))
          .sort((a, b) => b.value - a.value)
      ),
    (async () => {
      const adminWhere = {
        role: { notIn: ["SUPER_ADMIN", "PARLIAMENT_MEMBER"] as Role[] },
        OR: [{ serialNumber: null }, { serialNumber: { not: { startsWith: "DEL-" } } }],
        ...(officeManagerIds.length > 0 ? { id: { notIn: officeManagerIds } } : {}),
      };
      const [adminTotal, adminEnabled, delegatesTotal, delegatesEnabled, parliamentTotal, parliamentEnabled] =
        await Promise.all([
          prisma.user.count({ where: adminWhere }),
          prisma.user.count({ where: { ...adminWhere, enabled: true } }),
          prisma.user.count({
            where: { serialNumber: { startsWith: "DEL-" } },
          }),
          prisma.user.count({
            where: { serialNumber: { startsWith: "DEL-" }, enabled: true },
          }),
          prisma.user.count({ where: { role: "PARLIAMENT_MEMBER" } }),
          prisma.user.count({ where: { role: "PARLIAMENT_MEMBER", enabled: true } }),
        ]);
      return {
        accounts: {
          total: adminTotal + delegatesTotal,
          adminAccounts: adminTotal,
          delegates: delegatesTotal,
          enabled: adminEnabled + delegatesEnabled,
          disabled: adminTotal + delegatesTotal - adminEnabled - delegatesEnabled,
        },
        parliamentMembers: {
          total: parliamentTotal,
          enabled: parliamentEnabled,
          disabled: parliamentTotal - parliamentEnabled,
        },
      };
    })(),
    (async () => {
      const [formations, subDeptsCount] = await Promise.all([
        prisma.formation.findMany({ select: { type: true } }),
        prisma.formationSubDept.count(),
      ]);
      const byType: Record<string, number> = {};
      for (const f of formations) {
        byType[f.type] = (byType[f.type] || 0) + 1;
      }
      return {
        totalFormations: formations.length,
        totalSubDepartments: subDeptsCount,
        byType,
      };
    })(),
  ]);

  return NextResponse.json({
    period,
    timelineData,
    statusData,
    officesData,
    delegatesData,
    transactionTypes,
    overdueList: overdueList.map((t) => ({ id: t.id, citizenName: t.citizenName, officeName: t.office.name })),
    inactiveOffices,
    sourceSectionBreakdown,
    accountsSummary,
    ministriesSummary,
  });
}
