import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import {
  TRANSACTION_TYPE_FIELD_KEY,
  listTransactionTypeOptions,
  resolveTransactionTypeValue,
} from "@/lib/transaction-type-options";

export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const options = await listTransactionTypeOptions(false);
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
    return NextResponse.json({ error: "اسم الخيار مطلوب" }, { status: 400 });
  }

  const existing = await prisma.formFieldOption.findMany({
    where: { fieldKey: TRANSACTION_TYPE_FIELD_KEY },
    select: { value: true, label: true },
  });
  if (existing.some((e) => e.label === label)) {
    return NextResponse.json({ error: "هذا الخيار موجود مسبقاً" }, { status: 409 });
  }

  const value = resolveTransactionTypeValue(
    label,
    typeof body.value === "string" ? body.value : undefined
  );
  if (existing.some((e) => e.value === value)) {
    return NextResponse.json({ error: "القيمة مستخدمة مسبقاً" }, { status: 409 });
  }

  const maxOrder = await prisma.formFieldOption.aggregate({
    where: { fieldKey: TRANSACTION_TYPE_FIELD_KEY },
    _max: { sortOrder: true },
  });

  const row = await prisma.formFieldOption.create({
    data: {
      fieldKey: TRANSACTION_TYPE_FIELD_KEY,
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
