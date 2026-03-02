import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDelegate } from "@/lib/api-auth";

/** إرجاع تكليفات المخول (الوزارات والدوائر المُعيَّنة له) */
export async function GET() {
  const auth = await requireDelegate();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { delegateId } = auth;

  const assignments = await prisma.delegateFormationAssignment.findMany({
    where: { delegateId },
    orderBy: { createdAt: "desc" },
    include: {
      formation: { select: { id: true, name: true, type: true } },
      subDept: { select: { id: true, name: true } },
    },
  });

  const items = assignments.map((a) => ({
    id: a.id,
    formationId: a.formationId,
    formationName: a.formation.name,
    formationType: a.formation.type,
    subDeptId: a.subDeptId,
    subDeptName: a.subDept?.name ?? null,
    createdAt: a.createdAt.toISOString(),
  }));

  return NextResponse.json(items);
}
