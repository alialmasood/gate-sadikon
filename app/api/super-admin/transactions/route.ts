import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { searchParams } = request.nextUrl;
  const officeId = searchParams.get("officeId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

  const where: { officeId?: string; status?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
  if (officeId) where.officeId = officeId;
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [transactions, overdueCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { office: { select: { id: true, name: true } } },
    }),
    prisma.transaction.count({ where: { status: "OVERDUE" } }),
  ]);

  return NextResponse.json({ transactions, overdueCount });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: { citizenName?: string; officeId?: string; status?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const officeId = typeof body.officeId === "string" ? body.officeId.trim() : "";
  if (!officeId) return NextResponse.json({ error: "المكتب مطلوب" }, { status: 400 });
  const citizenName = typeof body.citizenName === "string" ? body.citizenName.trim() || null : null;
  const status = typeof body.status === "string" ? body.status : "PENDING";
  const type = typeof body.type === "string" ? body.type.trim() || null : null;
  const transaction = await prisma.transaction.create({
    data: { citizenName, officeId, status, type, sourceSection: "ADMIN" },
    include: { office: { select: { id: true, name: true } } },
  });
  return NextResponse.json(transaction);
}
