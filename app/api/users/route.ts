import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
  createdAt: true,
  office: { select: { id: true, name: true } },
} as const;

/** الرقم التالي لمخول بناءً على أعلى رقم موجود (يتجنب التعارض بعد الحذف) */
async function nextDelegateSerialNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DEL-${year}-`;
  const latest = await prisma.user.findFirst({
    where: { serialNumber: { startsWith: prefix } },
    orderBy: { serialNumber: "desc" },
    select: { serialNumber: true },
  });
  let next = 1;
  if (latest?.serialNumber) {
    const parsed = Number.parseInt(latest.serialNumber.slice(prefix.length), 10);
    if (!Number.isNaN(parsed) && parsed >= 0) next = parsed + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const users = await prisma.user.findMany({
    where: { role: { not: "SUPER_ADMIN" } },
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });
  return NextResponse.json(users);
}

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
    ministry?: string;
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
  const ministry = typeof body.ministry === "string" ? body.ministry.trim() || null : null;
  const department = typeof body.department === "string" ? body.department.trim() || null : null;
  const officeId =
    body.officeId === null || body.officeId === ""
      ? null
      : typeof body.officeId === "string"
        ? body.officeId.trim() || null
        : null;

  let assignmentDate: Date | null = null;
  if (typeof body.assignmentDate === "string" && body.assignmentDate.trim()) {
    const d = new Date(body.assignmentDate.trim());
    if (!isNaN(d.getTime())) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d.getTime() > today.getTime()) {
        return NextResponse.json({ error: "تاريخ التكليف لا يقبل تواريخ مستقبلية" }, { status: 400 });
      }
      assignmentDate = d;
    }
  }

  if (body.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "إنشاء مدير أعلى (سوبر أدمن) من صلاحية إدارة المنصة فقط." },
      { status: 403 }
    );
  }

  const role = body.role === "ADMIN" || body.role === "USER" ? body.role : "USER";
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

  try {
    const hashed = await bcrypt.hash(password, 12);
    const serialNumber = role === "USER" ? await nextDelegateSerialNumber() : null;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          password: hashed,
          name,
          phone,
          address,
          avatarUrl,
          ministry,
          department,
          assignmentDate,
          serialNumber,
          officeId,
          role,
          enabled: true,
        },
        select: userSelect,
      });

      if (role === "USER" && serialNumber) {
        await tx.delegate.create({
          data: {
            userId: created.id,
            name: name || email,
            officeId,
            status: "ACTIVE",
          },
        });
      }

      return created;
    });

    return NextResponse.json(user);
  } catch (err) {
    console.error("POST /api/users failed:", err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const fields = Array.isArray(err.meta?.target) ? (err.meta?.target as string[]) : [];
        if (fields.includes("email")) {
          return NextResponse.json({ error: "الاسم المستخدم أو البريد الإلكتروني مستخدم مسبقاً" }, { status: 409 });
        }
        if (fields.includes("serialNumber")) {
          return NextResponse.json(
            { error: "تعارض في الرقم التسلسلي، أعد المحاولة" },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: "البيانات متعارضة مع سجل موجود" }, { status: 409 });
      }
      if (err.code === "P1001" || err.code === "P1017") {
        return NextResponse.json({ error: "تعذر الاتصال بقاعدة البيانات" }, { status: 503 });
      }
    }

    return NextResponse.json({ error: "فشل إنشاء الحساب، حاول مرة أخرى" }, { status: 500 });
  }
}
