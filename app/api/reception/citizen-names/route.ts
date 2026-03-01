import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrReception } from "@/lib/api-auth";

/**
 * يعيد قائمة بأسماء المواطنين ومعرفاتهم الفريدة من معاملات المكتب
 * متاح لـ ADMIN و RECEPTION لاستخدامها في اقتراحات حقول الاسم ومعرف المواطن
 */
export async function GET() {
  const auth = await requireAdminOrReception();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { officeId } = auth;

  if (!officeId) {
    return NextResponse.json({ names: [], citizenIds: [] });
  }

  const transactions = await prisma.transaction.findMany({
    where: { officeId },
    select: { citizenName: true, citizenId: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const seenNames = new Set<string>();
  const names: string[] = [];
  const seenIds = new Set<string>();
  const citizenIds: string[] = [];
  for (const t of transactions) {
    const name = (t.citizenName || "").trim();
    if (name) {
      const key = name.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        names.push(name);
      }
    }
    const id = (t.citizenId || "").trim();
    if (id) {
      const key = id.toLowerCase();
      if (!seenIds.has(key)) {
        seenIds.add(key);
        citizenIds.push(id);
      }
    }
  }

  names.sort((a, b) => a.localeCompare(b, "ar"));
  citizenIds.sort((a, b) => a.localeCompare(b, "ar"));

  return NextResponse.json({ names, citizenIds });
}
