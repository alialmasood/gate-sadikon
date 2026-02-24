import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const offices = await prisma.office.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          department: true,
          address: true,
        },
      },
      _count: { select: { users: true, transactions: true } },
    },
  });
  const list = offices.map((o) => {
    const linkedUsers = o.users.filter((u) => u.id !== o.managerId);
    return {
      id: o.id,
      name: o.name,
      type: o.type,
      location: o.location,
      status: o.status,
      managerId: o.managerId,
      manager: o.manager,
      managerName: o.managerName,
      managerPhone: o.managerPhone,
      managerAvatarUrl: o.managerAvatarUrl,
      assignmentDate: o.assignmentDate,
      userCount: o._count.users,
      transactionCount: o._count.transactions,
      createdAt: o.createdAt,
      linkedUsers,
    };
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: {
    name?: string;
    type?: string;
    location?: string;
    managerId?: string;
    managerName?: string;
    managerPhone?: string;
    managerAvatarUrl?: string | null;
    assignmentDate?: string | null;
    status?: string;
    email?: string;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "اسم المكتب مطلوب" }, { status: 400 });
  const type = typeof body.type === "string" ? body.type.trim() || null : null;
  const location = typeof body.location === "string" ? body.location.trim() || null : null;
  const managerName = typeof body.managerName === "string" ? body.managerName.trim() || null : null;
  const managerPhone = typeof body.managerPhone === "string" ? body.managerPhone.trim() || null : null;
  const managerAvatarUrl = body.managerAvatarUrl === null ? null : typeof body.managerAvatarUrl === "string" ? body.managerAvatarUrl.trim() || null : null;
  let assignmentDate: Date | null = null;
  if (typeof body.assignmentDate === "string" && body.assignmentDate.trim()) {
    const d = new Date(body.assignmentDate);
    if (!isNaN(d.getTime())) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d.getTime() > today.getTime()) {
        return NextResponse.json({ error: "تاريخ التكليف لا يقبل تواريخ مستقبلية" }, { status: 400 });
      }
      assignmentDate = d;
    }
  }
  const status = body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const email = emailRaw.toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

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
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "البريد الإلكتروني مستخدم مسبقاً" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const office = await tx.office.create({
      data: { name, type, location, managerName, managerPhone, managerAvatarUrl, assignmentDate, status },
    });
    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        name: managerName,
        phone: managerPhone,
        address: location,
        avatarUrl: managerAvatarUrl,
        assignmentDate,
        role: "ADMIN",
        officeId: office.id,
        enabled: true,
      },
    });
    const updatedOffice = await tx.office.update({
      where: { id: office.id },
      data: { managerId: user.id },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { users: true, transactions: true } },
      },
    });
    return updatedOffice;
  });

  return NextResponse.json({
    id: result.id,
    name: result.name,
    type: result.type,
    location: result.location,
    status: result.status,
    managerId: result.managerId,
    manager: result.manager,
    managerName: result.managerName,
    managerPhone: result.managerPhone,
    managerAvatarUrl: result.managerAvatarUrl,
    assignmentDate: result.assignmentDate,
    userCount: result._count.users,
    transactionCount: result._count.transactions,
    createdAt: result.createdAt,
  });
}
