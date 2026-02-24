import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

/**
 * إرجاع قائمة المواطنين الفريدين من المعاملات مع إحصائيات معاملاتهم
 */
export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const transactions = await prisma.transaction.findMany({
    where: { citizenName: { not: null } },
    select: {
      id: true,
      citizenName: true,
      status: true,
      officeId: true,
      createdAt: true,
      completedAt: true,
      office: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const byCitizen = new Map<
    string,
    {
      name: string;
      total: number;
      pending: number;
      done: number;
      overdue: number;
      transactions: { id: string; status: string; officeName: string; createdAt: string; completedAt: string | null }[];
    }
  >();

  for (const t of transactions) {
    const name = (t.citizenName || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!byCitizen.has(key)) {
      byCitizen.set(key, {
        name,
        total: 0,
        pending: 0,
        done: 0,
        overdue: 0,
        transactions: [],
      });
    }
    const c = byCitizen.get(key)!;
    c.total++;
    if (t.status === "PENDING") c.pending++;
    else if (t.status === "DONE") c.done++;
    else if (t.status === "OVERDUE") c.overdue++;
    c.transactions.push({
      id: t.id,
      status: t.status,
      officeName: t.office?.name || "—",
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() || null,
    });
  }

  const citizens = Array.from(byCitizen.values()).sort((a, b) => b.total - a.total);
  return NextResponse.json({ citizens });
}
