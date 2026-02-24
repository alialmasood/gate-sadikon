import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * إرجاع الدوائر الفرعية للتشكيل المُختار
 * التشكيلات والدوائر الفرعية من نظام super-admin/ministries
 */
export async function GET(request: NextRequest) {
  const formationId = request.nextUrl.searchParams.get("formationId")?.trim();
  if (!formationId) return NextResponse.json([]);

  const subDepts = await prisma.formationSubDept.findMany({
    where: { formationId, status: "ACTIVE" },
    select: { id: true, name: true, formationId: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(subDepts);
}
