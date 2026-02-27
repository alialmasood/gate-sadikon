import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeName(s: string): string {
  return s
    .trim()
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * إرجاع التشكيلات (الوزارات والجهات) المُدخلة من صفحة super-admin/ministries
 * كل تشكيل يظهر مرة واحدة فقط — حتى لو وُجد 100 تشكيل بنفس الاسم في قاعدة البيانات
 */
export async function GET() {
  const formations = await prisma.formation.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  const seen = new Set<string>();
  const unique = formations.filter((f) => {
    const key = normalizeName(f.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json(unique);
}
