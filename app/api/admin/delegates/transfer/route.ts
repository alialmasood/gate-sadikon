import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminOrAdmin } from "@/lib/api-auth";
import { prismaOfficeIdFilter, resolveOfficeScope } from "@/lib/office-scope";
import { getTransactionStageLabel, type StoredDelegateAction } from "@/lib/transaction-stage";

export const dynamic = "force-dynamic";

/**
 * نقل معاملة من مخول إلى مخول آخر.
 * تُحدَّث إحالة المعاملة فقط: تختفي من حساب المخول الأصلي وتظهر في حساب المخول الجديد
 * مع اسم المكتب والمرحلة التي وصلت إليها. لا يُحذف سجل المعاملة.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdminOrAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { transactionId?: string; toUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const transactionId = typeof body.transactionId === "string" ? body.transactionId.trim() : "";
  const toUserId = typeof body.toUserId === "string" ? body.toUserId.trim() : "";
  if (!transactionId || !toUserId) {
    return NextResponse.json({ error: "حدد المعاملة والمخول الجديد" }, { status: 400 });
  }

  const officeWhere: { officeId?: ReturnType<typeof prismaOfficeIdFilter> } = {};
  if (auth.role === "ADMIN") {
    if (!auth.officeId) return NextResponse.json({ error: "الحساب غير مرتبط بمكتب" }, { status: 403 });
    const scope = await resolveOfficeScope(auth.officeId);
    if (!scope) return NextResponse.json({ error: "المكتب غير موجود" }, { status: 403 });
    officeWhere.officeId = prismaOfficeIdFilter(scope.officeIds);
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, ...officeWhere },
    include: {
      office: { select: { name: true } },
      delegate: { select: { id: true, name: true, userId: true } },
    },
  });
  if (!transaction) return NextResponse.json({ error: "المعاملة غير موجودة أو خارج نطاق مكتبك" }, { status: 404 });
  if (!transaction.delegateId || !transaction.delegate) {
    return NextResponse.json({ error: "المعاملة غير محالة إلى مخول" }, { status: 400 });
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: toUserId, serialNumber: { startsWith: "DEL-" }, enabled: true },
    select: { id: true, name: true, email: true, officeId: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "حساب المخول الجديد غير موجود أو غير مفعّل" }, { status: 400 });
  }

  let targetDelegate = await prisma.delegate.findFirst({
    where: { userId: targetUser.id },
    select: { id: true, name: true, status: true },
  });
  if (targetDelegate && targetDelegate.status !== "ACTIVE") {
    return NextResponse.json({ error: "حساب المخول الجديد غير نشط" }, { status: 400 });
  }
  if (!targetDelegate) {
    targetDelegate = await prisma.delegate.create({
      data: {
        userId: targetUser.id,
        name: targetUser.name || targetUser.email,
        officeId: targetUser.officeId,
        status: "ACTIVE",
      },
      select: { id: true, name: true, status: true },
    });
  }

  if (targetDelegate.id === transaction.delegateId) {
    return NextResponse.json({ error: "المعاملة محالة بالفعل إلى هذا المخول" }, { status: 400 });
  }

  const stageLabel = getTransactionStageLabel(transaction);
  const officeName = transaction.office?.name ?? "—";
  const fromName = transaction.delegate.name || "المخول السابق";
  const toName = targetDelegate.name || targetUser.name || targetUser.email;
  const previous = Array.isArray(transaction.delegateActions)
    ? (transaction.delegateActions as StoredDelegateAction[])
    : [];
  const transferNote: StoredDelegateAction = {
    kind: "TRANSFER",
    text: `تم تحويل المعاملة من المخول «${fromName}» إلى المخول «${toName}» من مكتب ${officeName}. المرحلة عند التحويل: ${stageLabel}.`,
    officeName,
    fromDelegateName: fromName,
    toDelegateName: toName,
    stageLabel,
    createdAt: new Date().toISOString(),
  };

  const updated = await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      delegateId: targetDelegate.id,
      delegateActions: [...previous, transferNote],
    },
    select: { id: true, delegateId: true, serialNumber: true },
  });

  return NextResponse.json({
    ok: true,
    id: updated.id,
    serialNumber: updated.serialNumber,
    delegateId: updated.delegateId,
    officeName,
    stageLabel,
    toDelegateName: toName,
  });
}
