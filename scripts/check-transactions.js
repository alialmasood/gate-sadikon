const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.transaction.count();
  const byOffice = await prisma.transaction.groupBy({
    by: ['officeId'],
    _count: { id: true },
  });
  const offices = await prisma.office.findMany({
    where: { id: { in: byOffice.map((b) => b.officeId) } },
    select: { id: true, name: true },
  });
  const nameMap = Object.fromEntries(offices.map((o) => [o.id, o.name]));
  console.log('إجمالي المعاملات:', count);
  console.log('توزيع حسب المكتب:');
  byOffice.forEach((b) => {
    console.log(`  - ${nameMap[b.officeId] || b.officeId}: ${b._count.id}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
