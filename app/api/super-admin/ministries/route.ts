import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

const FORMATION_TYPES = [
  "هيئة",
  "وزارة",
  "غرف تجارة وصناعة",
  "شركة حكومية",
  "شركة قطاع خاص",
  "غير مرتبطة بوزارة",
] as const;

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const subDepts = await prisma.formationSubDept.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      formation: true,
    },
  });

  const list = subDepts.map((s) => ({
    id: s.id,
    formationId: s.formationId,
    type: s.formation.type,
    name: s.formation.name,
    subDepartment: s.name,
    status: s.status,
    createdAt: s.createdAt,
  }));

  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: { type?: string; name?: string; subDepartment?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const type = typeof body.type === "string" ? body.type.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const subDepartment = typeof body.subDepartment === "string" ? body.subDepartment.trim() || null : null;

  if (!type || !FORMATION_TYPES.includes(type as (typeof FORMATION_TYPES)[number])) {
    return NextResponse.json(
      { error: "نوع التشكيل غير صالح" },
      { status: 400 }
    );
  }
  if (!name) {
    return NextResponse.json({ error: "اسم التشكيل مطلوب" }, { status: 400 });
  }

  let formation = await prisma.formation.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (!formation) {
    formation = await prisma.formation.create({
      data: { type, name, status: "ACTIVE" },
    });
  }

  const subDept = await prisma.formationSubDept.create({
    data: {
      formationId: formation.id,
      name: subDepartment || "—",
      status: "ACTIVE",
    },
    include: { formation: true },
  });

  return NextResponse.json({
    id: subDept.id,
    formationId: subDept.formationId,
    type: subDept.formation.type,
    name: subDept.formation.name,
    subDepartment: subDept.name,
    status: subDept.status,
    createdAt: subDept.createdAt,
  });
}
