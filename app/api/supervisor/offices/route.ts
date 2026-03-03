import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSupervision } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSupervision();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const offices = await prisma.office.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      location: true,
      managerName: true,
      manager: { select: { id: true, name: true } },
    },
  });
  const list = offices.map((o) => ({
    id: o.id,
    name: o.name,
    managerName: o.managerName || o.manager?.name || null,
    location: o.location,
  }));
  return NextResponse.json(list);
}
