import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** تسوية رقم المعاملة إلى 6 أرقام */
function normalizeSn(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.length > 6) return digits.slice(0, 6);
  return digits.padStart(6, "0");
}

/**
 * صفحة عامة لمتابعة المعاملة — لا تتطلب تسجيل دخول
 * إرجاع الوصل والمرفقات ومسيرة المعاملة
 */
export async function GET(request: NextRequest) {
  const rawSn = request.nextUrl.searchParams.get("sn")?.trim();
  const sn = rawSn ? normalizeSn(rawSn) : null;
  if (!sn) {
    return NextResponse.json({ found: false });
  }

  const t = await prisma.transaction.findUnique({
    where: { serialNumber: sn },
    include: {
      office: { select: { name: true } },
      formation: { select: { name: true } },
      delegate: { select: { name: true } },
    },
  });

  if (!t) {
    return NextResponse.json({ found: false });
  }

  let subDeptName: string | null = null;
  if (t.subDeptId) {
    const sd = await prisma.formationSubDept.findUnique({
      where: { id: t.subDeptId },
      select: { name: true },
    });
    subDeptName = sd?.name ?? null;
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const followUpUrl = `${baseUrl}/track?sn=${sn}`;

  const receipt = {
    citizenName: t.citizenName,
    citizenPhone: t.citizenPhone,
    citizenAddress: t.citizenAddress,
    citizenMinistry: t.citizenMinistry,
    citizenDepartment: t.citizenDepartment,
    citizenOrganization: t.citizenOrganization,
    transactionType: t.transactionType || t.type,
    formationName: t.formation?.name ?? null,
    subDeptName,
    officeName: t.office?.name ?? null,
    serialNumber: t.serialNumber,
    followUpUrl,
    submissionDate: t.submissionDate?.toISOString() ?? null,
    createdAt: t.createdAt?.toISOString() ?? null,
  };

  const attachments = Array.isArray(t.attachments)
    ? (t.attachments as { url: string; name?: string }[]).filter((a) => a && typeof a.url === "string")
    : [];

  const workflow = {
    status: t.status,
    urgent: t.urgent,
    cannotComplete: t.cannotComplete,
    cannotCompleteReason: t.cannotCompleteReason,
    delegateName: t.delegate?.name ?? null,
    reachedSorting: t.reachedSorting,
    completedByAdmin: t.completedByAdmin,
    createdAt: t.createdAt?.toISOString() ?? null,
    updatedAt: t.updatedAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    delegateActions: t.delegateActions ?? [],
  };

  return NextResponse.json({
    found: true,
    receipt,
    attachments,
    workflow,
  });
}
