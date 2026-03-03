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
  req: NextRequest,
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
  ] = await Promise.all([
    prisma.transaction.count({ where: { officeId } }),
    prisma.transaction.count({ where: { officeId, createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.transaction.count({ where: { officeId, createdAt: { gte: monthStart } } }),
    prisma.transaction.count({ where: { officeId, createdAt: { gte: yearStart } } }),
    prisma.transaction.count({ where: { officeId, status: "PENDING" } }),
    prisma.transaction.count({ where: { officeId, status: "DONE" } }),
    prisma.transaction.count({ where: { officeId, status: "OVERDUE" } }),
  ]);

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
    },
  });
}
