import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireSuperAdmin } from "@/lib/api-auth";

function isValidEmailOrUsername(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  return emailRegex.test(v) || (usernameRegex.test(v) && v.length >= 2);
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const members = await prisma.user.findMany({
    where: { role: "PARLIAMENT_MEMBER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      enabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json(members);
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { name?: string; phone?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() || null : null;
  const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const email = emailRaw.toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  if (!name) return NextResponse.json({ error: "اسم عضو مجلس النواب مطلوب" }, { status: 400 });
  if (!isValidEmailOrUsername(email)) {
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

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      phone,
      role: "PARLIAMENT_MEMBER",
      enabled: true,
    },
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
