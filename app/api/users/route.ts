import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireSuperAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const users = await prisma.user.findMany({
    where: { role: { not: "SUPER_ADMIN" } },
    orderBy: { createdAt: "desc" },
    select: {
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
      createdAt: true,
      office: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: { email?: string; password?: string; name?: string; phone?: string; address?: string; avatarUrl?: string; ministry?: string; department?: string; assignmentDate?: string; role?: string; officeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() || null : null;
  const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
  const address = typeof body.address === "string" ? body.address.trim() || null : null;
  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() || null : null;
  const ministry = typeof body.ministry === "string" ? body.ministry.trim() || null : null;
  const department = typeof body.department === "string" ? body.department.trim() || null : null;
  const officeId = typeof body.officeId === "string" ? body.officeId.trim() || null : null;
  let assignmentDate: Date | null = null;
  if (typeof body.assignmentDate === "string" && body.assignmentDate.trim()) {
    const d = new Date(body.assignmentDate.trim());
    if (!isNaN(d.getTime())) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d.getTime() > today.getTime()) {
        return NextResponse.json(
          { error: "تاريخ التكليف لا يقبل تواريخ مستقبلية" },
          { status: 400 }
        );
      }
      assignmentDate = d;
    }
  }
  const roleRaw = body.role === "ADMIN" || body.role === "USER" ? body.role : "USER";
  if (body.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "إنشاء مدير أعلى (سوبر أدمن) من صلاحية إدارة المنصة فقط." },
      { status: 403 }
    );
  }
  const role = roleRaw;
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidUsername = /^[a-zA-Z0-9_.]+$/.test(emailRaw) && emailRaw.length >= 2;
  if (!email || (!isValidEmail && !isValidUsername)) {
    return NextResponse.json(
      { error: "أدخل بريداً إلكترونياً صالحاً أو اسم مستخدم بالإنجليزي (حروف، أرقام، _ أو .)" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "الاسم المستخدم أو البريد الإلكتروني مستخدم مسبقاً" }, { status: 409 });
  }

  let serialNumber: string | null = null;
  if (role === "USER") {
    const year = new Date().getFullYear();
    const count = await prisma.user.count({
      where: { role: "USER", serialNumber: { startsWith: `DEL-${year}-` } },
    });
    serialNumber = `DEL-${year}-${String(count + 1).padStart(4, "0")}`;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name, phone, address, avatarUrl, ministry, department, assignmentDate, serialNumber, officeId, role, enabled: true },
    select: {
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
      createdAt: true,
      office: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(user);
}
