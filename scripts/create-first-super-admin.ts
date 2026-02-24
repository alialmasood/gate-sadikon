/**
 * إنشاء أول حساب سوبر أدمن من متغيرات البيئة (اختياري في الإنتاج).
 * يشغّل مرة واحدة بعد النشر إذا لم يكن هناك أي سوبر أدمن.
 *
 * متغيرات البيئة (في .env أو .env.local):
 *   FIRST_SUPER_ADMIN_EMAIL   - البريد الإلكتروني (مطلوب)
 *   FIRST_SUPER_ADMIN_PASSWORD - كلمة المرور (8 أحرف على الأقل)
 *   FIRST_SUPER_ADMIN_NAME    - الاسم (اختياري)
 *
 * تشغيل: npm run create-super-admin
 */
import { readFileSync, existsSync } from "fs";
import path from "path";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.FIRST_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.FIRST_SUPER_ADMIN_PASSWORD;
  const name = process.env.FIRST_SUPER_ADMIN_NAME?.trim() || null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("أضف FIRST_SUPER_ADMIN_EMAIL صالحاً في البيئة.");
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error("أضف FIRST_SUPER_ADMIN_PASSWORD (8 أحرف على الأقل) في البيئة.");
    process.exit(1);
  }

  const existing = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  if (existing > 0) {
    console.log("يوجد بالفعل سوبر أدمن. لم يتم إنشاء حساب جديد.");
    return;
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    console.error("البريد الإلكتروني مستخدم مسبقاً بحساب آخر.");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: "SUPER_ADMIN",
      enabled: true,
    },
  });
  console.log("تم إنشاء أول سوبر أدمن:", email);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
