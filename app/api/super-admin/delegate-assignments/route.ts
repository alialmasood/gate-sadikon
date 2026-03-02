import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

/** إرجاع جميع التكليفات مع تفاصيل المخول والتشكيل */
export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const assignments = await prisma.delegateFormationAssignment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      delegate: {
        select: {
          id: true,
          name: true,
          userId: true,
        },
      },
      formation: { select: { id: true, name: true, type: true } },
      subDept: { select: { id: true, name: true } },
    },
  });

  const userIds = assignments
    .map((a) => a.delegate?.userId)
    .filter((id): id is string => !!id);
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, serialNumber: true },
        })
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const items = assignments.map((a) => ({
    id: a.id,
    delegateId: a.delegateId,
    delegateName: a.delegate?.name ?? null,
    userId: a.delegate?.userId ?? null,
    userEmail: a.delegate?.userId ? userMap[a.delegate.userId]?.email ?? null : null,
    serialNumber: a.delegate?.userId ? userMap[a.delegate.userId]?.serialNumber ?? null : null,
    formationId: a.formationId,
    formationName: a.formation.name,
    formationType: a.formation.type,
    subDeptId: a.subDeptId,
    subDeptName: a.subDept?.name ?? null,
    createdAt: a.createdAt.toISOString(),
  }));

  return NextResponse.json(items);
}

/** إضافة تكليف (وزارة + دائرة) للمخول */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { userId: string; formationId: string; subDeptId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const formationId = typeof body.formationId === "string" ? body.formationId.trim() : "";
  const subDeptId =
    body.subDeptId != null && body.subDeptId !== "" ? String(body.subDeptId).trim() : null;

  if (!userId || !formationId) {
    return NextResponse.json({ error: "معرّف المستخدم والتشكيل مطلوبان" }, { status: 400 });
  }

  const delegate = await prisma.delegate.findFirst({
    where: { userId },
    select: { id: true, formationIds: true },
  });
  if (!delegate) {
    return NextResponse.json({ error: "المخول غير موجود أو الحساب غير مرتبط بمخول" }, { status: 404 });
  }

  const formation = await prisma.formation.findFirst({
    where: { id: formationId, status: "ACTIVE" },
  });
  if (!formation) {
    return NextResponse.json({ error: "التشكيل غير موجود" }, { status: 404 });
  }

  if (subDeptId) {
    const subDept = await prisma.formationSubDept.findFirst({
      where: { id: subDeptId, formationId, status: "ACTIVE" },
    });
    if (!subDept) {
      return NextResponse.json({ error: "الدائرة الفرعية غير موجودة أو غير مرتبطة بالتشكيل" }, { status: 404 });
    }
  }

  const existing = await prisma.delegateFormationAssignment.findFirst({
    where: {
      delegateId: delegate.id,
      formationId,
      subDeptId: subDeptId ?? null,
    },
  });
  if (existing) {
    return NextResponse.json({ error: "هذا التكليف مُسجّل مسبقاً" }, { status: 409 });
  }

  await prisma.delegateFormationAssignment.create({
    data: {
      delegateId: delegate.id,
      formationId,
      subDeptId,
    },
  });

  const currentIds = (Array.isArray(delegate.formationIds) ? delegate.formationIds : []) as string[];
  if (!currentIds.includes(formationId)) {
    await prisma.delegate.update({
      where: { id: delegate.id },
      data: { formationIds: [...currentIds, formationId] },
    });
  }

  return NextResponse.json({ ok: true });
}
