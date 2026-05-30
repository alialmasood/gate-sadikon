import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkSystemKey } from "@/lib/system-setup-auth";

export async function GET(request: NextRequest) {
  if (!checkSystemKey(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, enabled: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  let body: { systemKey?: string; email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  if (!checkSystemKey(request, body)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() || null : null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "البريد الإلكتروني مستخدم مسبقاً" }, { status: 409 });
  }
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name, role: "SUPER_ADMIN", enabled: true },
    select: { id: true, email: true, name: true, enabled: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json(user);
}
