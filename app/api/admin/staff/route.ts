import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "مدير المنصة",
  ADMIN: "مدير المكتب",
  RECEPTION: "استقبال",
  SORTING: "قسم الفرز",
  COORDINATOR: "تنسيق ومتابعة",
  DOCUMENTATION: "توثيق",
  USER: "مخول",
  AUDITOR: "مدقق",
  PARLIAMENT_MEMBER: "نائب",
  SUPERVISION: "إشراف",
};

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  const users = await prisma.user.findMany({
    where: { officeId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      enabled: true,
      createdAt: true,
    },
    orderBy: [{ enabled: "desc" }, { name: "asc" }],
  });

  const list = users.map((u) => ({
    id: u.id,
    name: u.name || u.email,
    email: u.email,
    role: u.role,
    roleLabel: ROLE_LABELS[u.role] ?? u.role,
    enabled: u.enabled,
    createdAt: u.createdAt.toISOString(),
  }));

  return NextResponse.json({ staff: list });
}
