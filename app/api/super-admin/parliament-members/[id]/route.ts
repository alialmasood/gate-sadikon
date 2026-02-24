import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  let body: { name?: string; phone?: string; enabled?: boolean; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!target) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  if (target.role !== "PARLIAMENT_MEMBER") {
    return NextResponse.json({ error: "هذا الحساب ليس حساباً برلمانياً" }, { status: 403 });
  }

  const updateData: { name?: string | null; phone?: string | null; enabled?: boolean; password?: string } = {};
  if (body.name !== undefined) updateData.name = typeof body.name === "string" ? body.name.trim() || null : null;
  if (body.phone !== undefined) updateData.phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
  if (typeof body.enabled === "boolean") updateData.enabled = body.enabled;
  if (body.password !== undefined && typeof body.password === "string" && body.password.length >= 8) {
    updateData.password = await bcrypt.hash(body.password, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول لتحديثها" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      enabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!target) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  if (target.role !== "PARLIAMENT_MEMBER") {
    return NextResponse.json({ error: "هذا الحساب ليس حساباً برلمانياً" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
