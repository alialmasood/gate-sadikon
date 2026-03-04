import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** تسوية رقم المعاملة إلى 6 أرقام */
function normalizeSn(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.length > 6) return digits.slice(0, 6);
  return digits.padStart(6, "0");
}

/** تسوية رقم الهاتف للمقارنة — أخذ آخر 10 أرقام (للتوافق 07X مع 9647X) */
function normalizePhoneForCompare(phone: string | null): string {
  if (!phone || typeof phone !== "string") return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

/**
 * صفحة عامة لمتابعة المعاملة — تتطلب الرقم التسلسلي + رقم هاتف المواطن للمصادقة
 * إرجاع الوصل والمرفقات ومسيرة المعاملة عند تطابق الرقم والهاتف
 */
export async function GET(request: NextRequest) {
  const rawSn = request.nextUrl.searchParams.get("sn")?.trim();
  const rawPhone = request.nextUrl.searchParams.get("phone")?.trim();
  const sn = rawSn ? normalizeSn(rawSn) : null;
  if (!sn || !rawPhone) {
    return NextResponse.json({ found: false });
  }

  const t = await prisma.transaction.findUnique({
    where: { serialNumber: sn },
    include: {
      office: { select: { name: true } },
      formation: { select: { name: true } },
    },
  });

  if (!t) {
    return NextResponse.json({ found: false });
  }

  const storedPhone = normalizePhoneForCompare(t.citizenPhone);
  const providedPhone = normalizePhoneForCompare(rawPhone);
  if (!storedPhone || storedPhone !== providedPhone) {
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
    hasDelegate: !!t.delegateId,
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
