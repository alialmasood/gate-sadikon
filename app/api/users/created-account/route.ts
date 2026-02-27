import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: {
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
    address?: string;
    avatarUrl?: string;
    department?: string;
    assignmentDate?: string;
    role?: string;
    officeId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const email = emailRaw.toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() || null : null;
  const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
  const address = typeof body.address === "string" ? body.address.trim() || null : null;
  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() || null : null;
  const department = typeof body.department === "string" ? body.department.trim() || null : null;
  const officeId = body.officeId === null || body.officeId === "" ? null : typeof body.officeId === "string" ? body.officeId.trim() || null : null;
  let assignmentDate: Date | null = null;
  if (typeof body.assignmentDate === "string" && body.assignmentDate.trim()) {
    const d = new Date(body.assignmentDate.trim());
    if (!isNaN(d.getTime())) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d.getTime() > today.getTime()) {
        return NextResponse.json(
          { error: "تاريخ إنشاء الحساب لا يقبل تواريخ مستقبلية" },
          { status: 400 }
        );
      }
      assignmentDate = d;
    }
  }
  const VALID_ROLES: Role[] = ["AUDITOR", "COORDINATOR", "RECEPTION", "SORTING", "DOCUMENTATION"];
  const role: Role = typeof body.role === "string" && VALID_ROLES.includes(body.role as Role) ? (body.role as Role) : "COORDINATOR";

  if (!email || !/^[a-zA-Z0-9_.]+$/.test(emailRaw) || emailRaw.length < 2) {
    return NextResponse.json(
      { error: "الاسم المستخدم يقبل أحرفاً إنجليزية وأرقاماً و _ و . فقط (حرفين على الأقل)" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "الاسم المستخدم مستخدم مسبقاً" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      phone,
      address,
      avatarUrl,
      department,
      assignmentDate,
      officeId,
      role,
      enabled: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      address: true,
      avatarUrl: true,
      department: true,
      assignmentDate: true,
      serialNumber: true,
      role: true,
      enabled: true,
      officeId: true,
      createdAt: true,
      office: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(user);
}
