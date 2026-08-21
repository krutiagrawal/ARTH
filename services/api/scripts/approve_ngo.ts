import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const email = process.argv[2];
  if (!email) throw new Error('Usage: tsx scripts/approve_ngo.ts <email>');
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.ngoProfile.update({ where: { userId: user.id }, data: { status: 'approved' } });
  console.log(`approved ngo profile for ${email}`);
}
main().finally(() => prisma.$disconnect());
