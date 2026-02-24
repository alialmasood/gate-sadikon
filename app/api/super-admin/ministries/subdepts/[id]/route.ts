import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  let body: { subDepartment?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (typeof body.subDepartment === "string") data.name = body.subDepartment.trim();
  if (body.status === "ACTIVE" || body.status === "INACTIVE") data.status = body.status;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول لتحديثها" }, { status: 400 });
  }
  const subDept = await prisma.formationSubDept.update({
    where: { id },
    data,
    include: { formation: true },
  });
  return NextResponse.json({
    id: subDept.id,
    formationId: subDept.formationId,
    type: subDept.formation.type,
    name: subDept.formation.name,
    subDepartment: subDept.name,
    status: subDept.status,
    createdAt: subDept.createdAt,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  await prisma.formationSubDept.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
