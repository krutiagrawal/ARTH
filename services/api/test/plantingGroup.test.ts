import { describe, it, expect } from 'vitest';
import {
  createGroupSchema,
  discoverGroupsQuerySchema,
  groupIdParamSchema,
  inviteSchema,
  setRoleSchema,
  updateGroupSchema,
} from '../src/schemas/plantingGroup.schema';
import { MAX_GROUPS_CREATED_PER_USER, MAX_GROUP_MEMBERS } from '../src/constants/plantingGroups';

describe('planting group limits', () => {
  it('uses the agreed caps: 100 members per group, 5 groups created per person', () => {
    expect(MAX_GROUP_MEMBERS).toBe(100);
    expect(MAX_GROUPS_CREATED_PER_USER).toBe(5);
  });
});

describe('planting group input validation', () => {
  const valid = { name: 'Green Family', handle: 'green_family', description: 'We plant on weekends', groupType: 'family', city: 'Pune' };

  it('accepts a normal group and defaults the type', () => {
    expect(createGroupSchema.safeParse(valid).success).toBe(true);
    const { groupType, ...noType } = valid;
    expect(createGroupSchema.parse(noType).groupType).toBe('other');
  });

  it('rejects bad handles, empty or oversized text, and unknown types', () => {
    expect(createGroupSchema.safeParse({ ...valid, handle: 'Has Spaces' }).success).toBe(false);
    expect(createGroupSchema.safeParse({ ...valid, handle: 'ab' }).success).toBe(false);
    expect(createGroupSchema.safeParse({ ...valid, name: 'x' }).success).toBe(false);
    expect(createGroupSchema.safeParse({ ...valid, description: 'x'.repeat(501) }).success).toBe(false);
    expect(createGroupSchema.safeParse({ ...valid, groupType: 'corporate' }).success).toBe(false);
    // A city is required.
    const { city, ...noCity } = valid;
    expect(createGroupSchema.safeParse(noCity).success).toBe(false);
  });

  it('accepts every offered group type', () => {
    for (const groupType of ['family', 'friends', 'school', 'college', 'club', 'neighbourhood', 'workplace', 'other']) {
      expect(createGroupSchema.safeParse({ ...valid, groupType }).success).toBe(true);
    }
  });

  it('only ever reads the listed fields, so a request cannot set the creator or an id', () => {
    const parsed = createGroupSchema.parse({ ...valid, createdById: 'someone-else', id: 'x' }) as Record<string, unknown>;
    expect(parsed.createdById).toBeUndefined();
    expect(parsed.id).toBeUndefined();
    const update = updateGroupSchema.parse({ name: 'New name', handle: 'sneaky', createdById: 'x' }) as Record<string, unknown>;
    expect(update.handle).toBeUndefined();
    expect(update.createdById).toBeUndefined();
  });

  it('requires uuids for ids and a real role for role changes', () => {
    expect(groupIdParamSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    expect(groupIdParamSchema.safeParse({ id: '3f2b8f0e-6f43-4d9f-9a4e-2b1c1f6f8a11' }).success).toBe(true);
    expect(setRoleSchema.safeParse({ role: 'owner' }).success).toBe(false);
    expect(setRoleSchema.safeParse({ role: 'admin' }).success).toBe(true);
  });

  it('keeps invite handles and search text within bounds', () => {
    expect(inviteSchema.safeParse({ handle: 'valid_handle' }).success).toBe(true);
    expect(inviteSchema.safeParse({ handle: 'Not Valid!' }).success).toBe(false);
    expect(discoverGroupsQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
    expect(discoverGroupsQuerySchema.safeParse({ q: 'x'.repeat(61) }).success).toBe(false);
  });
});

describe('group level and streak rules', () => {
  const day = (iso: string) => new Date(`${iso}T10:00:00Z`);

  it('uses the same level rule as an individual: a level every 500 XP', async () => {
    const { levelForXp } = await import('../src/services/plantingGroupScope.service');
    expect(levelForXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpPerLevel: 500 });
    expect(levelForXp(499)).toMatchObject({ level: 1, xpIntoLevel: 499 });
    expect(levelForXp(500)).toMatchObject({ level: 2, xpIntoLevel: 0 });
    expect(levelForXp(1250)).toMatchObject({ level: 3, xpIntoLevel: 250 });
  });

  it('blurs a personal tree to about 1 km but keeps group trees and your own exact', async () => {
    const { visibleCoordinates } = await import('../src/services/plantingGroupScope.service');
    const personal = { lat: 18.523456, lng: 73.856789, plantingGroupId: null, userId: 'other' };
    expect(visibleCoordinates(personal, 'g1', 'me')).toEqual({ lat: 18.52, lng: 73.86, approximate: true });
    expect(visibleCoordinates({ ...personal, plantingGroupId: 'g1' }, 'g1', 'me')).toEqual({ lat: 18.523456, lng: 73.856789, approximate: false });
    expect(visibleCoordinates({ ...personal, userId: 'me' }, 'g1', 'me').approximate).toBe(false);
    // Planted for a different group: still someone's personal spot as far as this group is concerned.
    expect(visibleCoordinates({ ...personal, plantingGroupId: 'g2' }, 'g1', 'me').approximate).toBe(true);
  });

  it('counts consecutive planting days and keeps the streak alive through yesterday only', async () => {
    const { computeStreak } = await import('../src/services/plantingGroupInsights.service');
    const now = day('2026-11-11');
    expect(computeStreak([], now)).toEqual({ current: 0, max: 0 });
    // Three days in a row ending today.
    expect(computeStreak([day('2026-11-09'), day('2026-11-10'), day('2026-11-11')], now)).toEqual({ current: 3, max: 3 });
    // Last planting was yesterday: still alive.
    expect(computeStreak([day('2026-11-09'), day('2026-11-10')], now).current).toBe(2);
    // Last planting two days ago: broken, but the best run is remembered.
    expect(computeStreak([day('2026-11-07'), day('2026-11-08'), day('2026-11-09')], now)).toEqual({ current: 0, max: 3 });
    // Several plantings on one day count once.
    expect(computeStreak([day('2026-11-11'), day('2026-11-11')], now)).toEqual({ current: 1, max: 1 });
  });
});
