import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { prismaOfficeIdFilter } from "@/lib/office-scope";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId, officeIds, isCentralOffice, officeName } = auth;
  const officeFilter = prismaOfficeIdFilter(officeIds);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [transactionsToday, totalTransactions, doneTransactions, overdueCount] = await Promise.all([
    prisma.transaction.count({
      where: { officeId: officeFilter, createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.transaction.count({ where: { officeId: officeFilter } }),
    prisma.transaction.count({ where: { officeId: officeFilter, status: "DONE" } }),
    prisma.transaction.count({ where: { officeId: officeFilter, status: "OVERDUE" } }),
  ]);

  const completionRate = totalTransactions > 0 ? Math.round((doneTransactions / totalTransactions) * 100) : 0;

  return NextResponse.json({
    officeName: isCentralOffice ? `${officeName} (مركزي — كل الفروع)` : officeName,
    isCentralOffice,
    transactionsToday,
    totalTransactions,
    doneTransactions,
    overdueCount,
    completionRate,
  });
}
