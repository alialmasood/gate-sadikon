import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { requireSuperAdmin } from "@/lib/api-auth";

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  address: true,
  avatarUrl: true,
  ministry: true,
  department: true,
  assignmentDate: true,
  serialNumber: true,
  role: true,
  enabled: true,
  officeId: true,
  office: { select: { id: true, name: true } },
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  let body: { enabled?: boolean; name?: string; phone?: string; address?: string; avatarUrl?: string | null; ministry?: string; department?: string; assignmentDate?: string | null; officeId?: string | null; role?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "لا يمكن تعديل حساب الإدارة العليا من هذه الصفحة" }, { status: 403 });
  }
  const updateData: { enabled?: boolean; name?: string | null; phone?: string | null; address?: string | null; avatarUrl?: string | null; ministry?: string | null; department?: string | null; assignmentDate?: Date | null; officeId?: string | null; role?: string; password?: string } = {};
  if (typeof body.enabled === "boolean") updateData.enabled = body.enabled;
  if (body.name !== undefined) updateData.name = typeof body.name === "string" ? body.name.trim() || null : null;
  if (body.phone !== undefined) updateData.phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
  if (body.address !== undefined) updateData.address = typeof body.address === "string" ? body.address.trim() || null : null;
  if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl === null || body.avatarUrl === "" ? null : (typeof body.avatarUrl === "string" ? body.avatarUrl : null);
  if (body.ministry !== undefined) updateData.ministry = typeof body.ministry === "string" ? body.ministry.trim() || null : null;
  if (body.department !== undefined) updateData.department = typeof body.department === "string" ? body.department.trim() || null : null;
  if (body.assignmentDate !== undefined) {
    if (body.assignmentDate === null || body.assignmentDate === "") {
      updateData.assignmentDate = null;
    } else if (typeof body.assignmentDate === "string") {
      const d = new Date(body.assignmentDate);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (d.getTime() > today.getTime()) {
          return NextResponse.json(
            { error: "تاريخ التكليف لا يقبل تواريخ مستقبلية" },
            { status: 400 }
          );
        }
        updateData.assignmentDate = d;
      }
    }
  }
  if (body.officeId !== undefined) updateData.officeId = body.officeId === null || body.officeId === "" ? null : (typeof body.officeId === "string" ? body.officeId : null);
  const VALID_ROLES = ["AUDITOR", "COORDINATOR", "RECEPTION", "SORTING", "DOCUMENTATION"];
  if (typeof body.role === "string" && VALID_ROLES.includes(body.role)) updateData.role = body.role;
  if (body.password !== undefined && typeof body.password === "string" && body.password.length >= 8) {
    updateData.password = await bcrypt.hash(body.password, 12);
  }
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول لتحديثها" }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id },
    data: updateData as Prisma.UserUpdateInput,
    select: userSelect,
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
  const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!targetUser) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  if (targetUser.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "لا يمكن حذف مدير أعلى" }, { status: 403 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.delegate.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });
  return NextResponse.json({ ok: true });
}
