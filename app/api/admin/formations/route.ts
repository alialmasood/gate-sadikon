import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrReception } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdminOrReception();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formations = await prisma.formation.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  const seen = new Set<string>();
  const unique = formations.filter((f) => {
    const key = f.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json(unique);
}
