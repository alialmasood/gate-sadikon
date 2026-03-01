import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDelegate } from "@/lib/api-auth";

/** عرض تفاصيل معاملة معينة للمخول (معاملاته فقط) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDelegate();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { delegateId } = auth;
  const { id } = await params;

  const transaction = await prisma.transaction.findFirst({
    where: { id, delegateId },
    include: { office: { select: { name: true } } },
  });
  if (!transaction) return NextResponse.json({ error: "المعاملة غير موجودة" }, { status: 404 });

  let formationName: string | null = null;
  let subDeptName: string | null = null;
  if (transaction.formationId) {
    const f = await prisma.formation.findUnique({
      where: { id: transaction.formationId },
      select: { name: true },
    });
    formationName = f?.name ?? null;
  }
  if (transaction.subDeptId) {
    const s = await prisma.formationSubDept.findUnique({
      where: { id: transaction.subDeptId },
      select: { name: true },
    });
    subDeptName = s?.name ?? null;
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const followUpUrl = transaction.serialNumber
    ? `${baseUrl}/track?sn=${transaction.serialNumber}`
    : null;

  return NextResponse.json({
    id: transaction.id,
    citizenName: transaction.citizenName,
    citizenPhone: transaction.citizenPhone,
    citizenAddress: transaction.citizenAddress,
    citizenIsEmployee: transaction.citizenIsEmployee,
    citizenEmployeeSector: transaction.citizenEmployeeSector,
    citizenMinistry: transaction.citizenMinistry,
    citizenDepartment: transaction.citizenDepartment,
    citizenOrganization: transaction.citizenOrganization,
    status: transaction.status,
    type: transaction.type,
    transactionType: transaction.transactionType,
    transactionTitle: transaction.transactionTitle,
    serialNumber: transaction.serialNumber,
    submissionDate: transaction.submissionDate,
    formationName,
    subDeptName,
    attachments: transaction.attachments,
    createdAt: transaction.createdAt,
    completedAt: transaction.completedAt,
    officeName: transaction.office?.name ?? null,
    assignedFromSection: transaction.assignedFromSection ?? null,
    followUpUrl,
    urgent: transaction.urgent,
    cannotComplete: transaction.cannotComplete,
    reachedSorting: transaction.reachedSorting,
    delegateActions: transaction.delegateActions ?? [],
  });
}

type DelegateAction = { text: string; attachmentUrl?: string; attachmentName?: string; createdAt: string };

/** إضافة إجراء أو إكمال المعاملة */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDelegate(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { delegateId } = auth;
  const { id } = await params;

  const transaction = await prisma.transaction.findFirst({
    where: { id, delegateId },
  });
  if (!transaction) return NextResponse.json({ error: "المعاملة غير موجودة" }, { status: 404 });

  let body: { addAction?: DelegateAction; complete?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const data: { delegateActions?: object; status?: string; completedAt?: Date | null } = {};

  if (body.addAction) {
    const action = body.addAction as DelegateAction;
    const text = typeof action.text === "string" ? action.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "نص الإجراء مطلوب" }, { status: 400 });
    }
    const actions = (transaction.delegateActions as DelegateAction[] | null) ?? [];
    const newAction: DelegateAction = {
      text,
      attachmentUrl: typeof action.attachmentUrl === "string" ? action.attachmentUrl : undefined,
      attachmentName: typeof action.attachmentName === "string" ? action.attachmentName : undefined,
      createdAt: new Date().toISOString(),
    };
    data.delegateActions = [...actions, newAction] as object;
  }

  if (body.complete === true) {
    data.status = "DONE";
    data.completedAt = new Date();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data,
    include: { office: { select: { name: true } } },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    completedAt: updated.completedAt,
    delegateActions: updated.delegateActions ?? [],
  });
}
