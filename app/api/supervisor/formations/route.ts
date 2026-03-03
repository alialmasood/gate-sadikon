import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSupervision } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSupervision();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formationsRaw = await prisma.formation.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      subDepartments: {
        where: { status: "ACTIVE" },
        select: { id: true, name: true },
      },
    },
  });

  const seenNames = new Set<string>();
  const formations = formationsRaw
    .filter((f) => {
      const key = f.name.trim().toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    })
    .map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      subDepts: f.subDepartments.map((sd) => ({ id: sd.id, name: sd.name })),
    }));

  return NextResponse.json({ formations });
}
