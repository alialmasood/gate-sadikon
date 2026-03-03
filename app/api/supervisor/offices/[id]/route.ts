import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSupervision } from "@/lib/api-auth";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير المكتب",
  RECEPTION: "استقبال",
  SORTING: "قسم الفرز",
  COORDINATOR: "تنسيق ومتابعة",
  DOCUMENTATION: "توثيق",
  USER: "مخول",
  AUDITOR: "مدقق",
};

function getDateRanges() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
  return { todayStart, todayEnd, monthStart, yearStart };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSupervision();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id: officeId } = await params;

  const office = await prisma.office.findFirst({
    where: { id: officeId, status: "ACTIVE" },
    include: {
      manager: { select: { id: true, name: true, email: true, phone: true } },
      users: {
        where: { enabled: true },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { role: "asc" },
      },
      _count: { select: { transactions: true } },
    },
  });
  if (!office) return NextResponse.json({ error: "المكتب غير موجود" }, { status: 404 });

  const { todayStart, todayEnd, monthStart, yearStart } = getDateRanges();

  const [
    totalTransactions,
    todayCount,
    monthCount,
    yearCount,
    pendingCount,
    doneCount,
    overdueCount,
    delegates,
    _transactionsList,
    _formationsFromMinistries,
  ] = await Promise.all([
    prisma.transaction.count({ where: { officeId } }),
    prisma.transaction.count({ where: { officeId, createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.transaction.count({ where: { officeId, createdAt: { gte: monthStart } } }),
    prisma.transaction.count({ where: { officeId, createdAt: { gte: yearStart } } }),
    prisma.transaction.count({ where: { officeId, status: "PENDING" } }),
    prisma.transaction.count({ where: { officeId, status: "DONE" } }),
    prisma.transaction.count({ where: { officeId, status: "OVERDUE" } }),
    prisma.delegate.findMany({
      where: { status: "ACTIVE" },
      include: {
        assignments: {
          include: {
            formation: { select: { name: true } },
            subDept: { select: { name: true } },
          },
        },
      },
    }),
    prisma.transaction.findMany({
      where: { officeId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        formation: { select: { name: true } },
        delegate: { select: { name: true } },
      },
    }),
    prisma.formation.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: {
        subDepartments: {
          where: { status: "ACTIVE" },
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  const transactionsList = _transactionsList;
  const formationsRaw = _formationsFromMinistries;

  const seenNames = new Set<string>();
  const formations = formationsRaw
    .filter((f) => {
      const key = f.name.trim().toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    })
    .map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      subDepts: f.subDepartments.map((sd) => ({ id: sd.id, name: sd.name })),
    }));
  const formationsCount = formations.length;

  const delegateUserIds = delegates.map((d) => d.userId).filter((id): id is string => !!id);
  const delegateUsers =
    delegateUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: delegateUserIds } },
          select: { id: true, serialNumber: true, email: true, name: true, ministry: true, department: true },
        })
      : [];
  const userById = Object.fromEntries(delegateUsers.map((u) => [u.id, u]));
  const userByDelegateId = Object.fromEntries(
    delegates.filter((d) => d.userId && userById[d.userId]).map((d) => [d.id, userById[d.userId!]])
  );

  const delegateIds = delegates.map((d) => d.id);
  const [pendingByDelegate, doneByDelegate] =
    delegateIds.length > 0
      ? await Promise.all([
          prisma.transaction.groupBy({
            by: ["delegateId"],
            where: { officeId, delegateId: { in: delegateIds }, status: "PENDING" },
            _count: { id: true },
          }),
          prisma.transaction.groupBy({
            by: ["delegateId"],
            where: { officeId, delegateId: { in: delegateIds }, status: "DONE" },
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

  const delegatesWithStats = delegates.map((d) => {
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

  const subDeptIds = [...new Set(transactionsList.map((t) => t.subDeptId).filter(Boolean))] as string[];
  const subDepts = subDeptIds.length > 0
    ? await prisma.formationSubDept.findMany({ where: { id: { in: subDeptIds } }, select: { id: true, name: true } })
    : [];
  const subDeptMap = Object.fromEntries(subDepts.map((s) => [s.id, s.name]));

  const sections = office.users
    .filter((u) => u.role !== "ADMIN")
    .reduce(
      (acc, u) => {
        const label = ROLE_LABELS[u.role] ?? u.role;
        if (!acc[label]) acc[label] = [];
        acc[label].push({ id: u.id, name: u.name || u.email, email: u.email });
        return acc;
      },
      {} as Record<string, { id: string; name: string | null; email: string }[]>
    );

  const transactions = transactionsList.map((t) => ({
    id: t.id,
    citizenName: t.citizenName,
    serialNumber: t.serialNumber,
    status: t.status,
    formationName: t.formation?.name ?? null,
    subDeptName: (t.subDeptId && subDeptMap[t.subDeptId]) ?? null,
    delegateName: t.delegate?.name ?? null,
    reachedSorting: t.reachedSorting,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    assignedFromSection: t.assignedFromSection,
  }));

  return NextResponse.json({
    office: {
      id: office.id,
      name: office.name,
      location: office.location,
      managerName: office.managerName || office.manager?.name,
      managerPhone: office.manager?.phone,
    },
    sections: Object.entries(sections).map(([name, users]) => ({ name, users })),
    stats: {
      totalTransactions,
      todayCount,
      monthCount,
      yearCount,
      pendingCount,
      doneCount,
      overdueCount,
      delegatesCount: delegates.length,
      formationsCount,
    },
    delegates: delegatesWithStats,
    formations,
    transactions,
  });
}
