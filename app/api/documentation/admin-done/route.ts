import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDocumentationOrCoordinator } from "@/lib/api-auth";

/** إرجاع المعاملات المنجزة من قبل مدير المكتب */
export async function GET() {
  const auth = await requireAdminOrDocumentationOrCoordinator();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  const transactions = await prisma.transaction.findMany({
    where: { officeId, status: "DONE", completedByAdmin: true },
    orderBy: { completedAt: "desc" },
    take: 100,
    include: {
      formation: { select: { name: true } },
      office: { select: { name: true } },
    },
  });

  const formationSubDepts = await prisma.formationSubDept.findMany({
    where: { id: { in: transactions.map((t) => t.subDeptId).filter(Boolean) as string[] } },
    select: { id: true, name: true },
  });
  const subDeptMap = Object.fromEntries(formationSubDepts.map((s) => [s.id, s.name]));

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  return NextResponse.json(
    transactions.map((t) => ({
      id: t.id,
      citizenName: t.citizenName,
      citizenPhone: t.citizenPhone,
      citizenAddress: t.citizenAddress,
      citizenMinistry: t.citizenMinistry,
      citizenDepartment: t.citizenDepartment,
      citizenOrganization: t.citizenOrganization,
      transactionType: t.transactionType || t.type,
      transactionTitle: t.transactionTitle,
      serialNumber: t.serialNumber,
      formationName: t.formation?.name ?? null,
      subDeptName: t.subDeptId ? subDeptMap[t.subDeptId] ?? null : null,
      officeName: t.office?.name ?? null,
      submissionDate: t.submissionDate,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      attachments: t.attachments,
      followUpUrl: t.serialNumber ? `${baseUrl}/track?sn=${t.serialNumber}` : null,
    }))
  );
}
