import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const delegates = await prisma.delegate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(delegates);
}
