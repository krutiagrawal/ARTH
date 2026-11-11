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
  const valid = { name: 'Green Family', handle: 'green_family', description: 'We plant on weekends', groupType: 'family' };

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
