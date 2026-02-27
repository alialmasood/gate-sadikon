import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

/** تحديث بيانات المخول (مثل ربط التشكيلات) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  let body: { formationIds?: string[] | null; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const delegate = await prisma.delegate.findUnique({ where: { id } });
  if (!delegate) return NextResponse.json({ error: "المخول غير موجود" }, { status: 404 });

  const data: Prisma.DelegateUpdateInput = {};

  if (body.formationIds !== undefined) {
    data.formationIds = Array.isArray(body.formationIds) && body.formationIds.length > 0
      ? body.formationIds.filter((x): x is string => typeof x === "string")
      : Prisma.JsonNull;
  }
  if (body.name !== undefined && typeof body.name === "string") {
    const trimmed = body.name.trim();
    data.name = trimmed || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
  }

  const updated = await prisma.delegate.update({
    where: { id },
    data,
    select: { id: true, name: true, formationIds: true },
  });

  return NextResponse.json(updated);
}
