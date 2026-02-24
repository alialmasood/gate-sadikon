import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("Admin@2026!", 12);
  await prisma.user.upsert({
    where: { email: "admin@gate-sadikon.local" },
    update: {},
    create: {
      email: "admin@gate-sadikon.local",
      password: hashed,
      name: "مدير النظام",
      role: "SUPER_ADMIN",
    },
  });
  console.log("تم إنشاء المستخدم: admin@gate-sadikon.local / Admin@2026!");

  const basraOffices = [
    "مكتب مركز البصرة",
    "مكتب قضاء الزبير",
    "مكتب قضاء القرنة",
    "مكتب قضاء شط العرب",
  ];
  for (const name of basraOffices) {
    const existing = await prisma.office.findFirst({ where: { name } });
    if (!existing) {
      await prisma.office.create({ data: { name } });
    }
  }
  console.log("تم إنشاء مكاتب محافظة البصرة");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
