import crypto from 'crypto';
import { PrismaClient } from '@plant/db';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

// Bootstrap-only script: creates (or promotes) a role:'admin' User. There is
// no signup path anywhere in the app that produces an admin account, so this
// is the only way to get the first one. Deliberately skips the ForestTheme/
// Achievement seeding that a normal register() does — an admin account never
// touches any gamification route, so those rows are never read.
async function uniqueHandleFor(email: string): Promise<string> {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'admin';
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}_${crypto.randomBytes(2).toString('hex')}`;
    const existing = await prisma.user.findUnique({ where: { handle: candidate } });
    if (!existing) return candidate;
  }
  throw new Error(`Could not find a free handle based on "${base}" after 5 attempts`);
}

async function main() {
  const email = process.argv[2];
  const name = process.argv[3];
  if (!email || !name) throw new Error('Usage: tsx scripts/create_admin.ts <email> <name>');

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role === 'admin') {
      console.log(`${email} is already an admin.`);
      return;
    }
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } });
    console.log(`Promoted existing account ${email} to admin.`);
    return;
  }

  const password = crypto.randomBytes(18).toString('base64url');
  const passwordHash = await hashPassword(password);
  const handle = await uniqueHandleFor(email);

  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { role: 'admin', email, passwordHash, passwordPlain: password, name, handle },
    });
    await tx.userSettings.create({ data: { userId: created.id } });
  });

  console.log('Admin account created:');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log('Log in at /admin/login. Change this password once services/api supports self-service changes.');
}

main().finally(() => prisma.$disconnect());
