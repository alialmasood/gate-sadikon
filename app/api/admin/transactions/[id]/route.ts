import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;
  const { id } = await params;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const status = body.status === "DONE" || body.status === "PENDING" || body.status === "OVERDUE" ? body.status : undefined;
  if (!status) return NextResponse.json({ error: "الحالة مطلوبة" }, { status: 400 });

  const existing = await prisma.transaction.findFirst({
    where: { id, officeId },
  });
  if (!existing) return NextResponse.json({ error: "المعاملة غير موجودة" }, { status: 404 });

  const data: { status: string; completedAt?: Date | null } = { status };
  if (status === "DONE") data.completedAt = new Date();
  else data.completedAt = null;

  const transaction = await prisma.transaction.update({
    where: { id },
    data,
    include: { delegate: { select: { name: true } } },
  });

  return NextResponse.json({
    id: transaction.id,
    citizenName: transaction.citizenName,
    status: transaction.status,
    type: transaction.type,
    createdAt: transaction.createdAt,
    completedAt: transaction.completedAt,
    delegateName: transaction.delegate?.name ?? null,
  });
}
