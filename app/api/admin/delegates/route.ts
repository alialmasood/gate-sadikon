import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminOrAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** قائمة جميع المخولين في النظام — للقراءة فقط (للاستخدام في صفحة أدمن المكتب) */
export async function GET() {
  const auth = await requireSuperAdminOrAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const delegates = await prisma.user.findMany({
    where: {
      serialNumber: { startsWith: "DEL-" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      ministry: true,
      department: true,
      assignmentDate: true,
      serialNumber: true,
      enabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json(delegates);
}
