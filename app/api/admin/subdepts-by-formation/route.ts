import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrReception } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrReception();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formationId = request.nextUrl.searchParams.get("formationId")?.trim();
  if (!formationId) return NextResponse.json([]);

  const subDepts = await prisma.formationSubDept.findMany({
    where: { formationId, status: "ACTIVE" },
    select: { id: true, name: true, formationId: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(subDepts);
}
