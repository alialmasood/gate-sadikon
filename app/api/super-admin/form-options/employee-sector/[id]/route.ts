import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import { EMPLOYEE_SECTOR_FIELD_KEY } from "@/lib/employee-sector-options";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  const row = await prisma.formFieldOption.findFirst({
    where: { id, fieldKey: EMPLOYEE_SECTOR_FIELD_KEY },
  });
  if (!row) {
    return NextResponse.json({ error: "الخيار غير موجود" }, { status: 404 });
  }

  const enabledCount = await prisma.formFieldOption.count({
    where: { fieldKey: EMPLOYEE_SECTOR_FIELD_KEY, enabled: true },
  });
  if (enabledCount <= 1 && row.enabled) {
    return NextResponse.json({ error: "لا يمكن حذف آخر خيار في القائمة" }, { status: 400 });
  }

  await prisma.formFieldOption.update({
    where: { id },
    data: { enabled: false },
  });

  return NextResponse.json({ ok: true });
}
