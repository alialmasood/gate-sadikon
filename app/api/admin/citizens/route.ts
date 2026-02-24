import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  const transactions = await prisma.transaction.findMany({
    where: { officeId, citizenName: { not: null } },
    select: {
      id: true,
      citizenName: true,
      status: true,
      createdAt: true,
      completedAt: true,
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
      transactions: { id: string; status: string; createdAt: string; completedAt: string | null }[];
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
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() || null,
    });
  }

  const citizens = Array.from(byCitizen.values()).sort((a, b) => b.total - a.total);
  return NextResponse.json({ citizens });
}
