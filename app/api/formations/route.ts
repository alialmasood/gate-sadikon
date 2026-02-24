import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * إرجاع التشكيلات (الوزارات والجهات) المُدخلة من صفحة super-admin/ministries
 * متاح للجميع لاستخدامها في فورم إضافة المعاملات (استقبال، مدير مكتب، إلخ)
 */
export async function GET() {
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
