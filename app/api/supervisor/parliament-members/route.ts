import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSupervision } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSupervision();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const members = await prisma.user.findMany({
    where: { role: "PARLIAMENT_MEMBER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      enabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ members });
}
