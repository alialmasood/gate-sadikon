import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const formations = await prisma.formation.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
    },
    select: { id: true, name: true, type: true },
  });
  return NextResponse.json(formations);
}
