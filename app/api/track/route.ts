import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * صفحة عامة لمتابعة المعاملة — لا تتطلب تسجيل دخول
 */
export async function GET(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get("sn")?.trim();
  if (!sn || !/^\d{6}$/.test(sn)) {
    return NextResponse.json({ found: false });
  }

  const t = await prisma.transaction.findUnique({
    where: { serialNumber: sn },
    include: { office: { select: { name: true } } },
  });

  if (!t) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    status: t.status,
    officeName: t.office?.name ?? null,
    citizenName: t.citizenName,
    submissionDate: t.submissionDate?.toISOString() ?? null,
  });
}
