import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

/** حذف تكليف */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  const assignment = await prisma.delegateFormationAssignment.findUnique({
    where: { id },
    select: { delegateId: true, formationId: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "التكليف غير موجود" }, { status: 404 });
  }

  await prisma.delegateFormationAssignment.delete({ where: { id } });

  const remaining = await prisma.delegateFormationAssignment.count({
    where: { delegateId: assignment.delegateId, formationId: assignment.formationId },
  });
  if (remaining === 0) {
    const delegate = await prisma.delegate.findUnique({
      where: { id: assignment.delegateId },
      select: { formationIds: true },
    });
    if (delegate?.formationIds && Array.isArray(delegate.formationIds)) {
      const ids = (delegate.formationIds as string[]).filter((fid) => fid !== assignment.formationId);
      await prisma.delegate.update({
        where: { id: assignment.delegateId },
        data: { formationIds: ids.length > 0 ? ids : Prisma.JsonNull },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

/** تعديل تكليف */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  let body: { formationId?: string; subDeptId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const formationId = typeof body.formationId === "string" ? body.formationId.trim() : null;
  const subDeptId =
    body.subDeptId != null && body.subDeptId !== ""
      ? String(body.subDeptId).trim()
      : null;

  const assignment = await prisma.delegateFormationAssignment.findUnique({
    where: { id },
    include: { delegate: { select: { id: true, formationIds: true } } },
  });
  if (!assignment) {
    return NextResponse.json({ error: "التكليف غير موجود" }, { status: 404 });
  }

  const newFormationId = formationId || assignment.formationId;

  const formation = await prisma.formation.findFirst({
    where: { id: newFormationId, status: "ACTIVE" },
  });
  if (!formation) {
    return NextResponse.json({ error: "التشكيل غير موجود" }, { status: 404 });
  }

  if (subDeptId) {
    const subDept = await prisma.formationSubDept.findFirst({
      where: { id: subDeptId, formationId: newFormationId, status: "ACTIVE" },
    });
    if (!subDept) {
      return NextResponse.json({ error: "الدائرة الفرعية غير موجودة" }, { status: 404 });
    }
  }

  const existing = await prisma.delegateFormationAssignment.findFirst({
    where: {
      delegateId: assignment.delegateId,
      formationId: newFormationId,
      subDeptId: subDeptId ?? null,
      id: { not: id },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "هذا التكليف مُسجّل مسبقاً لهذا المخول" }, { status: 409 });
  }

  await prisma.delegateFormationAssignment.update({
    where: { id },
    data: { formationId: newFormationId, subDeptId },
  });

  const currentIds = (Array.isArray(assignment.delegate.formationIds)
    ? assignment.delegate.formationIds
    : []) as string[];
  if (!currentIds.includes(newFormationId)) {
    await prisma.delegate.update({
      where: { id: assignment.delegateId },
      data: { formationIds: [...currentIds, newFormationId] },
    });
  }

  return NextResponse.json({ ok: true });
}
