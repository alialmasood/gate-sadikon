import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

function isValidUsername(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  return emailRegex.test(v) || (usernameRegex.test(v) && v.length >= 2);
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const list = await prisma.user.findMany({
    where: { role: "SUPERVISION" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      enabled: true,
      createdAt: true,
    },
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: { name?: string; username?: string; password?: string; confirmPassword?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const usernameRaw = typeof body.username === "string" ? body.username.trim() : "";
  const username = usernameRaw.toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const description = typeof body.description === "string" ? body.description.trim() || null : null;

  if (!name) return NextResponse.json({ error: "اسم المشرف مطلوب" }, { status: 400 });
  if (!isValidUsername(usernameRaw)) {
    return NextResponse.json(
      { error: "الاسم المستخدم يقبل بريداً إلكترونياً أو اسم مستخدم بالإنجليزي (حروف، أرقام، _ أو .) فقط" },
      { status: 400 }
    );
  }
  if (password.length < 8) return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
  if (password !== confirmPassword) return NextResponse.json({ error: "كلمتا المرور غير متطابقتين" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: username } });
  if (existing) return NextResponse.json({ error: "الاسم المستخدم أو البريد الإلكتروني مستخدم مسبقاً" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: username,
      password: hashed,
      name,
      department: description,
      role: "SUPERVISION",
      enabled: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      enabled: true,
      createdAt: true,
    },
  });
  return NextResponse.json(user);
}
