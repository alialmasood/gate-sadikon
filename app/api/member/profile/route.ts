import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParliamentMember } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireParliamentMember();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      enabled: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  return NextResponse.json(user);
}
