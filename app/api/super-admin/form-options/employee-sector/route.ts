import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  EMPLOYEE_SECTOR_FIELD_KEY,
  listEmployeeSectorOptions,
  suggestEmployeeSectorValue,
} from "@/lib/employee-sector-options";

export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const options = await listEmployeeSectorOptions(false);
  return NextResponse.json(options);
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { label?: string; value?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return NextResponse.json({ error: "الاسم المعروض مطلوب" }, { status: 400 });
  }

  const existing = await prisma.formFieldOption.findMany({
    where: { fieldKey: EMPLOYEE_SECTOR_FIELD_KEY },
    select: { value: true, label: true },
  });
  if (existing.some((e) => e.label === label)) {
    return NextResponse.json({ error: "هذا الخيار موجود مسبقاً" }, { status: 409 });
  }

  const rawValue = typeof body.value === "string" ? body.value.trim().toUpperCase() : "";
  const value =
    rawValue && /^[A-Z][A-Z0-9_]*$/.test(rawValue)
      ? rawValue
      : suggestEmployeeSectorValue(
          label,
          existing.map((e) => e.value)
        );

  if (existing.some((e) => e.value === value)) {
    return NextResponse.json({ error: "رمز القيمة مستخدم مسبقاً" }, { status: 409 });
  }

  const maxOrder = await prisma.formFieldOption.aggregate({
    where: { fieldKey: EMPLOYEE_SECTOR_FIELD_KEY },
    _max: { sortOrder: true },
  });

  const row = await prisma.formFieldOption.create({
    data: {
      fieldKey: EMPLOYEE_SECTOR_FIELD_KEY,
      value,
      label,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      enabled: true,
    },
  });

  return NextResponse.json({
    id: row.id,
    value: row.value,
    label: row.label,
    sortOrder: row.sortOrder,
  });
}
