import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

async function cleanOrphanDelegates() {
  const delegates = await prisma.delegate.findMany({
    where: { userId: { not: null } },
    select: { id: true, userId: true },
  });

  const userIds = [...new Set(delegates.map((d) => d.userId!).filter(Boolean))];
  const existingUsers = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true },
  });
  const existingIds = new Set(existingUsers.map((u) => u.id));

  const orphanIds = delegates.filter((d) => d.userId && !existingIds.has(d.userId!)).map((d) => d.id);

  if (orphanIds.length === 0) {
    return { ok: true, deleted: 0, message: "لا يوجد مخولين يتيمين" };
  }

  await prisma.delegate.deleteMany({ where: { id: { in: orphanIds } } });
  return { ok: true, deleted: orphanIds.length };
}

/**
 * حذف المخولين اليتامى (سجلات Delegate ليس لها مستخدم مرتبط)
 * يُستدعى مرة واحدة لتنظيف البيانات القديمة
 */
export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const result = await cleanOrphanDelegates();
  return NextResponse.json(result);
}

export async function POST() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const result = await cleanOrphanDelegates();
  return NextResponse.json(result);
}
