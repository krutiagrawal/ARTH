import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, generatePublicId } from '@arth/db';

// These tests need a real Postgres database with the schema applied, so they only run when asked:
//   RUN_DB_TESTS=1 npx vitest run test/accountErasure.db.test.ts        (from services/api, with its .env)
// CI has no database, so they are skipped there. Every row they create is removed again.
const enabled = process.env.RUN_DB_TESTS === '1';
const tag = `erasetest${Date.now()}`;

describe.skipIf(!enabled)('account erasure (needs a database)', () => {
  let prisma: PrismaClient;
  let eraseAccount: typeof import('../src/services/accountErasure.service').eraseAccount;
  let uploadDir: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const { env } = await import('../src/config/env'); // loads .env (DATABASE_URL) before the client is created
    prisma = new PrismaClient();
    ({ eraseAccount } = await import('../src/services/accountErasure.service'));
    uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'avatars');
    fs.mkdirSync(uploadDir, { recursive: true });
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await prisma.donationCampaign.deleteMany({ where: { ngo: { userId: id } } }).catch(() => {});
      await prisma.ngoProfile.deleteMany({ where: { userId: id } }).catch(() => {});
      await prisma.tree.deleteMany({ where: { userId: id } }).catch(() => {});
      await prisma.user.delete({ where: { id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('wipes an individual: identity, addresses, tokens, posts, notifications, tree photo and avatar file', async () => {
    const species = await prisma.treeSpecies.findFirst();
    if (!species) throw new Error('local database has no tree species; run the seed first');
    const avatar = path.join(uploadDir, `${tag}.jpg`);
    fs.writeFileSync(avatar, 'x');

    const user = await prisma.user.create({
      data: { email: `${tag}@example.com`, phone: `9${Date.now().toString().slice(-9)}`, passwordHash: 'h', name: 'Real Person', handle: tag, bio: 'my bio', city: 'Pune', avatarUrl: `/uploads/avatars/${tag}.jpg`, dateOfBirth: new Date('1990-01-01') },
    });
    createdUserIds.push(user.id);
    await prisma.address.create({ data: { userId: user.id, line1: '12 Secret Lane', pincode: '411001', label: 'Home' } });
    await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: tag, expiresAt: new Date(Date.now() + 1e9) } });
    await prisma.pushToken.create({ data: { userId: user.id, token: tag, platform: 'android' } });
    const tree = await prisma.tree.create({
      data: { userId: user.id, speciesId: species.id, publicId: generatePublicId(), nickname: "Rahul's mango", lat: 18.520431, lng: 73.856744, locationLabel: 'My home', photoUrl: '/uploads/trees/none.jpg' } as any,
    });
    await prisma.post.create({ data: { userId: user.id, authorType: 'user', caption: 'hello', media: { create: [{ url: '/uploads/posts/none.jpg' }] } } as any });
    await prisma.notification.create({ data: { userId: user.id, type: 'friend_request', data: {} } as any });

    await eraseAccount(prisma, user.id);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.isDeleted).toBe(true);
    expect(after.name).toBe('Deleted user');
    expect(after.email).toMatch(/@deleted\.invalid$/);
    expect(after.phone).toBeNull();
    expect(after.bio).toBeNull();
    expect(after.city).toBeNull();
    expect(after.avatarUrl).toBeNull();
    expect(after.dateOfBirth).toBeNull();

    const t = await prisma.tree.findUniqueOrThrow({ where: { id: tree.id } });
    expect(t.nickname).toBe('Tree');
    expect(t.photoUrl).toBeNull();
    expect(t.locationLabel).toBeNull();
    expect(Number(t.lat)).toBe(18.52); // rounded to ~100 m

    for (const count of [
      await prisma.address.count({ where: { userId: user.id } }),
      await prisma.refreshToken.count({ where: { userId: user.id } }),
      await prisma.pushToken.count({ where: { userId: user.id } }),
      await prisma.post.count({ where: { userId: user.id } }),
      await prisma.notification.count({ where: { userId: user.id } }),
    ]) {
      expect(count).toBe(0);
    }
    expect(fs.existsSync(avatar)).toBe(false);
    await expect(eraseAccount(prisma, user.id)).rejects.toThrow(/not found/i);
  });

  it('refuses while an NGO has an active campaign, then takes the NGO offline and clears its contacts', async () => {
    const user = await prisma.user.create({ data: { role: 'ngo', email: `${tag}org@example.com`, passwordHash: 'h', name: 'Org Owner', handle: `${tag}org`, phone: `8${Date.now().toString().slice(-9)}` } });
    createdUserIds.push(user.id);
    const ngo = await prisma.ngoProfile.create({
      data: { userId: user.id, orgName: 'Test Org', description: 'd', status: 'approved', contactPhone: '9999999999', officialEmail: 'boss@org.test', primaryContactName: 'Boss', primaryContactPhone: '8888888888', website: 'https://org.test' },
    });
    const campaign = await prisma.donationCampaign.create({ data: { ngoId: ngo.id, title: 'c', description: 'd', status: 'active' } as any });

    await expect(eraseAccount(prisma, user.id)).rejects.toThrow(/active donation campaigns/);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).isDeleted).toBe(false);

    await prisma.donationCampaign.update({ where: { id: campaign.id }, data: { status: 'closed' } });
    await eraseAccount(prisma, user.id);

    const n = await prisma.ngoProfile.findUniqueOrThrow({ where: { id: ngo.id } });
    expect(n.status).toBe('suspended');
    expect(n.contactPhone).toBeNull();
    expect(n.officialEmail).toBeNull();
    expect(n.primaryContactName).toBeNull();
    expect(n.website).toBeNull();
    expect(n.orgName).toBe('Test Org'); // the organisation's legal identity is retained
  });
});
