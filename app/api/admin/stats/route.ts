import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [transactionsToday, totalTransactions, doneTransactions, overdueCount, office] = await Promise.all([
    prisma.transaction.count({
      where: { officeId, createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.transaction.count({ where: { officeId } }),
    prisma.transaction.count({ where: { officeId, status: "DONE" } }),
    prisma.transaction.count({ where: { officeId, status: "OVERDUE" } }),
    prisma.office.findUnique({
      where: { id: officeId },
      select: { name: true },
    }),
  ]);

  const completionRate = totalTransactions > 0 ? Math.round((doneTransactions / totalTransactions) * 100) : 0;

  return NextResponse.json({
    officeName: office?.name ?? "المكتب",
    transactionsToday,
    totalTransactions,
    doneTransactions,
    overdueCount,
    completionRate,
  });
}
