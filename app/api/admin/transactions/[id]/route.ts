import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrReception, requireAdminOrReceptionOrSorting } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrReceptionOrSorting();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;
  const { id } = await params;

  if (!officeId) {
    return NextResponse.json({ error: "الحساب غير مرتبط بمكتب" }, { status: 403 });
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id, officeId },
    include: {
      delegate: { select: { name: true } },
      office: { select: { name: true } },
    },
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
    citizenId: transaction.citizenId,
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
    formationId: transaction.formationId,
    formationName,
    subDeptId: transaction.subDeptId,
    subDeptName,
    attachments: transaction.attachments,
    createdAt: transaction.createdAt,
    completedAt: transaction.completedAt,
    delegateName: transaction.delegate?.name ?? null,
    officeName: transaction.office?.name ?? null,
    followUpUrl,
    urgent: transaction.urgent,
    cannotComplete: transaction.cannotComplete,
    completedByAdmin: transaction.completedByAdmin ?? false,
    cannotCompleteReason: transaction.cannotCompleteReason,
    reachedSorting: transaction.reachedSorting,
    delegateId: transaction.delegateId,
    delegateActions: transaction.delegateActions ?? [],
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrReception();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;
  const { id } = await params;

  if (!officeId) {
    return NextResponse.json({ error: "الحساب غير مرتبط بمكتب" }, { status: 403 });
  }

  const existing = await prisma.transaction.findFirst({
    where: { id, officeId },
  });
  if (!existing) return NextResponse.json({ error: "المعاملة غير موجودة" }, { status: 404 });

  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrReceptionOrSorting();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId, role } = auth;
  const { id } = await params;

  if (!officeId) {
    return NextResponse.json({ error: "الحساب غير مرتبط بمكتب" }, { status: 403 });
  }

  let body: {
    status?: string;
    urgent?: boolean;
    cannotComplete?: boolean;
    cannotCompleteReason?: string | null;
    delegateId?: string | null;
    completedByAdmin?: boolean;
    citizenId?: string;
    citizenName?: string;
    citizenPhone?: string;
    citizenAddress?: string;
    citizenIsEmployee?: boolean;
    citizenEmployeeSector?: string;
    citizenMinistry?: string;
    citizenDepartment?: string;
    citizenOrganization?: string;
    transactionType?: string;
    transactionTitle?: string;
    submissionDate?: string;
    formationId?: string;
    subDeptId?: string;
    attachments?: { url: string; name?: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const existing = await prisma.transaction.findFirst({
    where: { id, officeId },
  });
  if (!existing) return NextResponse.json({ error: "المعاملة غير موجودة" }, { status: 404 });

  if (role === "ADMIN" && (body.delegateId !== undefined || (body.status === "DONE" && body.completedByAdmin === true))) {
    const adminData: Record<string, unknown> = {};
    if (body.delegateId !== undefined) {
      const delegateId = typeof body.delegateId === "string" && body.delegateId.trim() ? body.delegateId.trim() : null;
      if (delegateId) {
        const delegate = await prisma.delegate.findFirst({
          where: { id: delegateId, status: "ACTIVE" },
          select: { officeId: true },
        });
        if (!delegate) {
          return NextResponse.json({ error: "المخول غير موجود أو غير مفعّل" }, { status: 400 });
        }
        if (delegate.officeId && delegate.officeId !== officeId) {
          return NextResponse.json({ error: "المخول غير مرتبط بنفس المكتب" }, { status: 400 });
        }
        adminData.delegateId = delegateId;
        adminData.assignedFromSection = "ADMIN";
        adminData.sourceSection = "ADMIN";
        adminData.urgent = false;
        adminData.reachedSorting = true;
      } else {
        adminData.delegateId = null;
      }
    }
    if (body.status === "DONE" && body.completedByAdmin === true) {
      adminData.status = "DONE";
      adminData.completedAt = new Date();
      adminData.completedByAdmin = true;
      adminData.urgent = false;
    }
    if (Object.keys(adminData).length > 0) {
      const updated = await prisma.transaction.update({
        where: { id },
        data: adminData,
        include: { delegate: { select: { name: true } }, office: { select: { name: true } } },
      });
      return NextResponse.json({
        id: updated.id,
        status: updated.status,
        delegateId: updated.delegateId,
        delegateName: updated.delegate?.name ?? null,
        completedAt: updated.completedAt,
        completedByAdmin: updated.completedByAdmin,
      });
    }
  }

  if (role === "SORTING") {
    const sortData: { urgent?: boolean; cannotComplete?: boolean; cannotCompleteReason?: string | null; reachedSorting?: boolean; delegateId?: string | null; assignedFromSection?: string } = {};
    if (body.urgent !== undefined) sortData.urgent = body.urgent === true;
    if (body.cannotComplete !== undefined) sortData.cannotComplete = body.cannotComplete === true;
    if (body.cannotCompleteReason !== undefined) sortData.cannotCompleteReason = typeof body.cannotCompleteReason === "string" ? body.cannotCompleteReason.trim() || null : null;
    if (body.delegateId !== undefined) {
      const delegateId = typeof body.delegateId === "string" && body.delegateId.trim() ? body.delegateId.trim() : null;
      if (delegateId) {
        const delegate = await prisma.delegate.findFirst({
          where: { id: delegateId, status: "ACTIVE" },
          select: { officeId: true },
        });
        if (!delegate) {
          return NextResponse.json({ error: "المخول غير موجود أو غير مفعّل" }, { status: 400 });
        }
        if (delegate.officeId && delegate.officeId !== officeId) {
          return NextResponse.json({ error: "المخول غير مرتبط بنفس المكتب" }, { status: 400 });
        }
        sortData.delegateId = delegateId;
        sortData.assignedFromSection = "SORTING";
        sortData.urgent = false;
        sortData.reachedSorting = true;
      } else {
        sortData.delegateId = null;
      }
    }
    if (Object.keys(sortData).length > 0) {
      const updatePayload = { ...sortData, reachedSorting: sortData.reachedSorting ?? true };
      const updated = await prisma.transaction.update({
        where: { id },
        data: updatePayload,
        select: { id: true, urgent: true, cannotComplete: true, cannotCompleteReason: true, reachedSorting: true, delegateId: true },
      });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.urgent !== undefined) data.urgent = body.urgent === true;
  if (body.cannotComplete !== undefined) data.cannotComplete = body.cannotComplete === true;
  if (body.cannotCompleteReason !== undefined) data.cannotCompleteReason = typeof body.cannotCompleteReason === "string" ? body.cannotCompleteReason.trim() || null : null;

  const status = body.status === "DONE" || body.status === "PENDING" || body.status === "OVERDUE" ? body.status : undefined;
  if (status) {
    data.status = status;
    data.completedAt = status === "DONE" ? new Date() : null;
  }

  if (body.citizenId !== undefined) data.citizenId = typeof body.citizenId === "string" ? body.citizenId.trim() || null : null;
  if (body.citizenName !== undefined) data.citizenName = typeof body.citizenName === "string" ? body.citizenName.trim() || null : null;
  if (body.citizenPhone !== undefined) data.citizenPhone = typeof body.citizenPhone === "string" ? body.citizenPhone.trim() || null : null;
  if (body.citizenAddress !== undefined) data.citizenAddress = typeof body.citizenAddress === "string" ? body.citizenAddress.trim() || null : null;
  if (body.citizenIsEmployee !== undefined) data.citizenIsEmployee = body.citizenIsEmployee === true ? true : body.citizenIsEmployee === false ? false : null;
  if (body.citizenEmployeeSector !== undefined) {
    const sector = ["GOVERNMENT", "PRIVATE", "MIXED", "NOT_LINKED", "OTHER"].includes(body.citizenEmployeeSector || "") ? body.citizenEmployeeSector : null;
    data.citizenEmployeeSector = sector;
  }
  if (body.citizenMinistry !== undefined) data.citizenMinistry = typeof body.citizenMinistry === "string" ? body.citizenMinistry.trim() || null : null;
  if (body.citizenDepartment !== undefined) data.citizenDepartment = typeof body.citizenDepartment === "string" ? body.citizenDepartment.trim() || null : null;
  if (body.citizenOrganization !== undefined) data.citizenOrganization = typeof body.citizenOrganization === "string" ? body.citizenOrganization.trim() || null : null;
  if (body.transactionType !== undefined) data.transactionType = typeof body.transactionType === "string" ? body.transactionType.trim() || null : null;
  if (body.transactionTitle !== undefined) data.transactionTitle = typeof body.transactionTitle === "string" ? body.transactionTitle.trim() || null : null;
  if (body.formationId !== undefined) data.formationId = typeof body.formationId === "string" ? body.formationId.trim() || null : null;
  if (body.subDeptId !== undefined) data.subDeptId = typeof body.subDeptId === "string" ? body.subDeptId.trim() || null : null;

  if (typeof body.submissionDate === "string" && body.submissionDate.trim()) {
    const d = new Date(body.submissionDate);
    data.submissionDate = !isNaN(d.getTime()) ? d : null;
  } else if (body.submissionDate === null) {
    data.submissionDate = null;
  }

  if (Array.isArray(body.attachments)) {
    data.attachments = body.attachments
      .filter((a): a is { url: string; name?: string } => typeof a?.url === "string")
      .map((a) => ({ url: a.url, name: typeof a.name === "string" ? a.name : undefined })) as object;
  }

  if (role === "COORDINATOR" && Object.keys(data).length > 0) {
    data.sourceSection = "COORDINATOR";
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: data as object,
    include: { delegate: { select: { name: true } }, office: { select: { name: true } } },
  });

  return NextResponse.json({
    id: transaction.id,
    citizenId: transaction.citizenId,
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
    formationId: transaction.formationId,
    subDeptId: transaction.subDeptId,
    attachments: transaction.attachments,
    createdAt: transaction.createdAt,
    completedAt: transaction.completedAt,
    delegateName: transaction.delegate?.name ?? null,
    officeName: transaction.office?.name ?? null,
  });
}
