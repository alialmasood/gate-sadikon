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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, role: "SUPERVISION" },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      enabled: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const existing = await prisma.user.findFirst({
    where: { id, role: "SUPERVISION" },
  });
  if (!existing) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

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
  if (password && password.length < 8) return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
  if (password && password !== confirmPassword) return NextResponse.json({ error: "كلمتا المرور غير متطابقتين" }, { status: 400 });

  const duplicate = await prisma.user.findFirst({
    where: { email: username, id: { not: id } },
  });
  if (duplicate) return NextResponse.json({ error: "الاسم المستخدم أو البريد الإلكتروني مستخدم مسبقاً" }, { status: 409 });

  const data: { name: string; email: string; department: string | null; password?: string } = {
    name,
    email: username,
    department: description,
  };
  if (password) data.password = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id },
    data,
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const existing = await prisma.user.findFirst({
    where: { id, role: "SUPERVISION" },
  });
  if (!existing) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const enabled = body.enabled === true || body.enabled === false ? body.enabled : !existing.enabled;

  const user = await prisma.user.update({
    where: { id },
    data: { enabled },
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const existing = await prisma.user.findFirst({
    where: { id, role: "SUPERVISION" },
  });
  if (!existing) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
