import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  let body: {
    name?: string;
    type?: string;
    location?: string;
    managerId?: string | null;
    managerName?: string | null;
    managerPhone?: string | null;
    managerAvatarUrl?: string | null;
    assignmentDate?: string | null;
    status?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body.type !== undefined) data.type = typeof body.type === "string" ? body.type.trim() || null : null;
  if (body.location !== undefined) data.location = typeof body.location === "string" ? body.location.trim() || null : null;
  if (body.managerId !== undefined) data.managerId = body.managerId === null || body.managerId === "" ? null : (typeof body.managerId === "string" ? body.managerId : null);
  if (body.managerName !== undefined) data.managerName = typeof body.managerName === "string" ? body.managerName.trim() || null : null;
  if (body.managerPhone !== undefined) data.managerPhone = typeof body.managerPhone === "string" ? body.managerPhone.trim() || null : null;
  if (body.managerAvatarUrl !== undefined) data.managerAvatarUrl = typeof body.managerAvatarUrl === "string" ? body.managerAvatarUrl.trim() || null : null;
  if (body.assignmentDate !== undefined) {
    if (body.assignmentDate === null || body.assignmentDate === "") data.assignmentDate = null;
    else if (typeof body.assignmentDate === "string") {
      const d = new Date(body.assignmentDate);
      data.assignmentDate = !isNaN(d.getTime()) ? d : null;
    }
  }
  if (body.status === "ACTIVE" || body.status === "INACTIVE") data.status = body.status;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول لتحديثها" }, { status: 400 });
  }
  const office = await prisma.office.update({
    where: { id },
    data,
    include: {
      manager: { select: { id: true, name: true, email: true } },
      users: {
        select: { id: true, name: true, email: true, phone: true, avatarUrl: true, department: true, address: true },
      },
      _count: { select: { users: true, transactions: true } },
    },
  });
  const linkedUsers = office.users.filter((u) => u.id !== office.managerId);
  return NextResponse.json({
    id: office.id,
    name: office.name,
    type: office.type,
    location: office.location,
    status: office.status,
    managerId: office.managerId,
    manager: office.manager,
    managerName: office.managerName,
    managerPhone: office.managerPhone,
    managerAvatarUrl: office.managerAvatarUrl,
    assignmentDate: office.assignmentDate,
    userCount: office._count.users,
    transactionCount: office._count.transactions,
    createdAt: office.createdAt,
    linkedUsers,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  await prisma.office.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
