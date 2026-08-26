import { PrismaClient } from '@plant/db';
const prisma = new PrismaClient();
async function main() {
  const email = process.argv[2];
  if (!email) throw new Error('Usage: tsx scripts/promote_admin.ts <email>');
  await prisma.user.update({ where: { email }, data: { role: 'admin' } });
  console.log(`promoted ${email} to admin`);
}
main().finally(() => prisma.$disconnect());
