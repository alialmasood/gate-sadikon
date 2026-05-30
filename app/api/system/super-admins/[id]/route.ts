import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkSystemKey } from "@/lib/system-setup-auth";

const userSelect = {
  id: true,
  email: true,
  name: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
};

async function findSuperAdmin(id: string) {
  return prisma.user.findFirst({
    where: { id, role: "SUPER_ADMIN" },
    select: userSelect,
  });
}

async function countEnabledSuperAdmins(excludeId?: string) {
  return prisma.user.count({
    where: {
      role: "SUPER_ADMIN",
      enabled: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkSystemKey(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const user = await findSuperAdmin(id);
  if (!user) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: { systemKey?: string; enabled?: boolean; name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  if (!checkSystemKey(request, body)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await findSuperAdmin(id);
  if (!existing) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }

  const updateData: { enabled?: boolean; name?: string | null; password?: string } = {};

  if (typeof body.enabled === "boolean") {
    if (!body.enabled && existing.enabled) {
      const otherEnabled = await countEnabledSuperAdmins(id);
      if (otherEnabled === 0) {
        return NextResponse.json(
          { error: "لا يمكن تعطيل آخر حساب إدارة عليا مفعّل" },
          { status: 400 }
        );
      }
    }
    updateData.enabled = body.enabled;
  }

  if (body.name !== undefined) {
    updateData.name = typeof body.name === "string" ? body.name.trim() || null : null;
  }

  if (body.password !== undefined) {
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" },
        { status: 400 }
      );
    }
    updateData.password = await bcrypt.hash(password, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول لتحديثها" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });
  return NextResponse.json(user);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkSystemKey(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await findSuperAdmin(id);
  if (!existing) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }

  const totalSuperAdmins = await prisma.user.count({
    where: { role: "SUPER_ADMIN" },
  });
  if (totalSuperAdmins <= 1) {
    return NextResponse.json(
      { error: "لا يمكن حذف آخر حساب إدارة عليا" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
