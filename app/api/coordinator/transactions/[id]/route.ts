import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoordinatorOrSuperAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** تفاصيل معاملة واحدة لقسم المتابعة: بيانات الوصل والمرفقات والإجراءات */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCoordinatorOrSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      delegate: { select: { name: true } },
      office: { select: { name: true } },
    },
  });
  if (!transaction) return NextResponse.json({ error: "المعاملة غير موجودة" }, { status: 404 });

  let formationName: string | null = null;
  let subDeptName: string | null = null;
  if (transaction.formationId) {
    const formation = await prisma.formation.findUnique({
      where: { id: transaction.formationId },
      select: { name: true },
    });
    formationName = formation?.name ?? null;
  }
  if (transaction.subDeptId) {
    const subDept = await prisma.formationSubDept.findUnique({
      where: { id: transaction.subDeptId },
      select: { name: true },
    });
    subDeptName = subDept?.name ?? null;
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const followUpUrl = transaction.serialNumber ? `${baseUrl}/track?sn=${transaction.serialNumber}` : null;

  return NextResponse.json({
    id: transaction.id,
    citizenName: transaction.citizenName,
    citizenPhone: transaction.citizenPhone,
    citizenAddress: transaction.citizenAddress,
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
    officeName: transaction.office?.name ?? null,
    createdAt: transaction.createdAt,
    completedAt: transaction.completedAt,
    delegateName: transaction.delegate?.name ?? null,
    followUpUrl,
    urgent: transaction.urgent,
    cannotComplete: transaction.cannotComplete,
    cannotCompleteReason: transaction.cannotCompleteReason,
    completedByAdmin: transaction.completedByAdmin,
    reachedSorting: transaction.reachedSorting,
    sourceSection: transaction.sourceSection,
    delegateId: transaction.delegateId,
    attachments: transaction.attachments,
    delegateActions: transaction.delegateActions ?? [],
  });
}
