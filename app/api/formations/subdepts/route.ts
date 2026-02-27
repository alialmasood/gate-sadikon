import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * إرجاع الدوائر الفرعية للتشكيل المُختار
 * يجمع دوائر جميع التشكيلات التي تحمل نفس الاسم (بدون تكرار للتشكيل)
 */
export async function GET(request: NextRequest) {
  const formationId = request.nextUrl.searchParams.get("formationId")?.trim();
  if (!formationId) return NextResponse.json([]);

  const formation = await prisma.formation.findFirst({
    where: { id: formationId, status: "ACTIVE" },
    select: { name: true },
  });
  if (!formation) return NextResponse.json([]);

  const formationsWithSameName = await prisma.formation.findMany({
    where: {
      name: { equals: formation.name, mode: "insensitive" },
      status: "ACTIVE",
    },
    select: { id: true },
  });
  const formationIds = formationsWithSameName.map((f) => f.id);

  const subDepts = await prisma.formationSubDept.findMany({
    where: {
      formationId: { in: formationIds },
      status: "ACTIVE",
    },
    select: { id: true, name: true, formationId: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(subDepts);
}
