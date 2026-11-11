import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@arth/db';

// Small caps so the limit rules can be exercised with a handful of rows.
vi.mock('../src/constants/plantingGroups', () => ({ MAX_GROUP_MEMBERS: 3, MAX_GROUPS_CREATED_PER_USER: 2 }));

// Needs a real Postgres database with the schema applied, so it only runs when asked:
//   RUN_DB_TESTS=1 npx vitest run test/plantingGroup.db.test.ts        (from services/api, with its .env)
// CI has no database, so it is skipped there. Every row it creates is removed again.
const enabled = process.env.RUN_DB_TESTS === '1';
const tag = `grptest${Date.now()}`;

describe.skipIf(!enabled)('planting groups (needs a database)', () => {
  let prisma: PrismaClient;
  let svc: typeof import('../src/services/plantingGroup.service');
  let erase: typeof import('../src/services/accountErasure.service').eraseAccount;
  const userIds: string[] = [];

  async function makeUser(name: string, role: 'user' | 'ngo' = 'user') {
    const user = await prisma.user.create({
      data: { email: `${tag}-${name}@example.com`, passwordHash: 'h', name, handle: `${tag}${name}`.toLowerCase(), role },
    });
    userIds.push(user.id);
    return user;
  }
  const newGroup = (userId: string, handle: string) =>
    svc.createGroup(prisma, userId, { name: `Group ${handle}`, handle: `${tag}${handle}`.toLowerCase(), groupType: 'club', description: 'test group' });

  beforeAll(async () => {
    await import('../src/config/env');
    prisma = new PrismaClient();
    svc = await import('../src/services/plantingGroup.service');
    ({ eraseAccount: erase } = await import('../src/services/accountErasure.service'));
  });

  afterAll(async () => {
    await prisma.plantingGroup.deleteMany({ where: { createdById: { in: userIds } } }).catch(() => {});
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('lets anyone create a group instantly and makes them its admin', async () => {
    const maya = await makeUser('maya');
    const group = await newGroup(maya.id, 'first');
    const mine = await svc.listMyGroups(prisma, maya.id);
    expect(mine.find((g) => g.id === group.id)?.myRole).toBe('admin');
  });

  it('stops a person creating more than the allowed number of groups, even at the same moment', async () => {
    const dev = await makeUser('dev');
    const results = await Promise.allSettled([newGroup(dev.id, 'a1'), newGroup(dev.id, 'a2'), newGroup(dev.id, 'a3'), newGroup(dev.id, 'a4')]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    expect(await prisma.plantingGroup.count({ where: { createdById: dev.id } })).toBe(2);
  });

  it('refuses non-individual accounts and duplicate handles', async () => {
    const ngo = await makeUser('ngoacct', 'ngo');
    await expect(newGroup(ngo.id, 'ngo1')).rejects.toThrow(/individual/i);
    const a = await makeUser('dupa');
    const b = await makeUser('dupb');
    await newGroup(a.id, 'same');
    await expect(newGroup(b.id, 'same')).rejects.toThrow(/handle/i);
  });

  it('join request: needs an admin to approve, and a non-admin member cannot approve', async () => {
    const admin = await makeUser('adm1');
    const joiner = await makeUser('join1');
    const other = await makeUser('join2');
    const group = await newGroup(admin.id, 'join');

    const req = await svc.requestToJoin(prisma, joiner.id, group.id);
    await expect(svc.requestToJoin(prisma, joiner.id, group.id)).rejects.toThrow(/already asked/i);
    // Not an admin (not even a member): cannot see or act on requests.
    await expect(svc.respondToJoinRequest(prisma, other.id, group.id, req.id, 'approve')).rejects.toThrow();

    await svc.respondToJoinRequest(prisma, admin.id, group.id, req.id, 'approve');
    const members = await svc.listMembers(prisma, joiner.id, group.id, {});
    expect(members.items.map((m) => m.userId)).toContain(joiner.id);

    // A plain member now cannot approve the next request.
    const third = await makeUser('join3');
    const req2 = await svc.requestToJoin(prisma, third.id, group.id);
    await expect(svc.respondToJoinRequest(prisma, joiner.id, group.id, req2.id, 'approve')).rejects.toThrow(/admin/i);
  });

  it("an admin of one group cannot act on another group's request", async () => {
    const adminA = await makeUser('xa');
    const adminB = await makeUser('xb');
    const joiner = await makeUser('xj');
    const groupA = await newGroup(adminA.id, 'xga');
    const groupB = await newGroup(adminB.id, 'xgb');
    const req = await svc.requestToJoin(prisma, joiner.id, groupA.id);
    await expect(svc.respondToJoinRequest(prisma, adminB.id, groupB.id, req.id, 'approve')).rejects.toThrow(/not found/i);
    await expect(svc.respondToJoinRequest(prisma, adminB.id, groupA.id, req.id, 'approve')).rejects.toThrow();
  });

  it('invitation: only the invited person can answer it', async () => {
    const admin = await makeUser('inv1');
    const invitee = await makeUser('inv2');
    const stranger = await makeUser('inv3');
    const group = await newGroup(admin.id, 'inv');

    const invite = await svc.inviteUser(prisma, admin.id, group.id, `${tag}inv2`.toLowerCase());
    await expect(svc.respondToInvitation(prisma, stranger.id, invite.id, true)).rejects.toThrow(/not found/i);
    await svc.respondToInvitation(prisma, invitee.id, invite.id, true);
    // Answering twice does nothing the second time.
    await expect(svc.respondToInvitation(prisma, invitee.id, invite.id, true)).rejects.toThrow(/not found/i);
    expect((await svc.listMyGroups(prisma, invitee.id)).map((g) => g.id)).toContain(group.id);
  });

  it('enforces the member cap, including two approvals at once', async () => {
    const admin = await makeUser('cap0');
    const group = await newGroup(admin.id, 'cap');
    const people = await Promise.all(['cap1', 'cap2', 'cap3'].map((n) => makeUser(n)));
    const reqs = [];
    for (const p of people) reqs.push(await svc.requestToJoin(prisma, p.id, group.id));

    // Cap is 3 including the admin, so only two of the three can be approved.
    const outcomes = await Promise.allSettled(reqs.map((r) => svc.respondToJoinRequest(prisma, admin.id, group.id, r.id, 'approve')));
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(2);
    expect(await prisma.plantingGroupMember.count({ where: { groupId: group.id } })).toBe(3);
    const late = await makeUser('cap4');
    await expect(svc.requestToJoin(prisma, late.id, group.id)).rejects.toThrow(/full/i);
  });

  it('keeps at least one admin; an admin can promote others and then step down', async () => {
    const admin = await makeUser('adm2');
    const member = await makeUser('mem2');
    const group = await newGroup(admin.id, 'roles');
    const req = await svc.requestToJoin(prisma, member.id, group.id);
    await svc.respondToJoinRequest(prisma, admin.id, group.id, req.id, 'approve');

    await expect(svc.setMemberRole(prisma, admin.id, group.id, admin.id, 'member')).rejects.toThrow(/at least one admin/i);
    await expect(svc.removeMember(prisma, admin.id, group.id, admin.id)).rejects.toThrow(/someone else an admin/i);
    await expect(svc.setMemberRole(prisma, member.id, group.id, member.id, 'admin')).rejects.toThrow(/admin/i);

    await svc.setMemberRole(prisma, admin.id, group.id, member.id, 'admin');
    await svc.setMemberRole(prisma, member.id, group.id, admin.id, 'member');
    // Admins must be demoted before they can be removed by someone else.
    await svc.setMemberRole(prisma, member.id, group.id, admin.id, 'admin');
    await expect(svc.removeMember(prisma, member.id, group.id, admin.id)).rejects.toThrow(/regular member/i);
  });

  it('hides member lists from non-members and only lets the founder delete the group', async () => {
    const admin = await makeUser('del1');
    const second = await makeUser('del2');
    const outsider = await makeUser('del3');
    const group = await newGroup(admin.id, 'del');
    const req = await svc.requestToJoin(prisma, second.id, group.id);
    await svc.respondToJoinRequest(prisma, admin.id, group.id, req.id, 'approve');
    await svc.setMemberRole(prisma, admin.id, group.id, second.id, 'admin');

    await expect(svc.listMembers(prisma, outsider.id, group.id, {})).rejects.toThrow(/not found/i);
    await expect(svc.deleteGroup(prisma, second.id, group.id)).rejects.toThrow(/created the group/i);
    await expect(svc.deleteGroup(prisma, outsider.id, group.id)).rejects.toThrow(/not found/i);
    await svc.deleteGroup(prisma, admin.id, group.id);
    expect(await prisma.plantingGroup.count({ where: { id: group.id } })).toBe(0);
  });

  it('deleting an account removes the person from groups and keeps each group runnable', async () => {
    const founder = await makeUser('er1');
    const next = await makeUser('er2');
    const group = await newGroup(founder.id, 'erase');
    const req = await svc.requestToJoin(prisma, next.id, group.id);
    await svc.respondToJoinRequest(prisma, founder.id, group.id, req.id, 'approve');

    await erase(prisma, founder.id);
    // The remaining member inherits the group as admin.
    const left = await prisma.plantingGroupMember.findMany({ where: { groupId: group.id } });
    expect(left).toHaveLength(1);
    expect(left[0].userId).toBe(next.id);
    expect(left[0].role).toBe('admin');
    expect(await prisma.plantingGroupRequest.count({ where: { OR: [{ userId: founder.id }, { initiatedById: founder.id }] } })).toBe(0);

    // The last person leaving takes the group with them.
    await erase(prisma, next.id);
    expect(await prisma.plantingGroup.count({ where: { id: group.id } })).toBe(0);
  });
});
