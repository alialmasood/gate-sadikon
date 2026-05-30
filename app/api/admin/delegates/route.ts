import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminOrAdmin } from "@/lib/api-auth";
import { prismaUserOfficeIdFilter, resolveOfficeScope } from "@/lib/office-scope";

export const dynamic = "force-dynamic";

/** قائمة المخولين — السوبر أدمن يرى الكل، مدير المكتب المركزي يرى فروعه، الفرعي يرى مكتبه */
export async function GET() {
  const auth = await requireSuperAdminOrAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const where: { serialNumber: { startsWith: string }; officeId?: ReturnType<typeof prismaUserOfficeIdFilter> } = {
    serialNumber: { startsWith: "DEL-" },
  };

  if (auth.role === "ADMIN" && auth.officeId) {
    const scope = await resolveOfficeScope(auth.officeId);
    if (scope) where.officeId = prismaUserOfficeIdFilter(scope.officeIds);
  }

  const delegates = await prisma.user.findMany({
    where,
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
