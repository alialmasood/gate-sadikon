import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [formations, subDeptsCount] = await Promise.all([
    prisma.formation.findMany({
      select: { type: true },
    }),
    prisma.formationSubDept.count(),
  ]);

  const uniqueFormationsCount = formations.length;
  const byType: Record<string, number> = {};
  for (const f of formations) {
    byType[f.type] = (byType[f.type] || 0) + 1;
  }

  return NextResponse.json({
    totalFormations: uniqueFormationsCount,
    totalSubDepartments: subDeptsCount,
    byType,
  });
}
