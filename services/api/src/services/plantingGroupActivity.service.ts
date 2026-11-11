import { Prisma } from '@arth/db';

type Tx = Prisma.TransactionClient;

export type GroupActivityType =
  | 'member_joined'
  | 'member_left'
  | 'tree_planted'
  | 'tree_adopted'
  | 'donation_made'
  | 'challenge_created'
  | 'role_changed';

/**
 * Appends one line to a group's timeline. Never throws: the timeline is a side effect of the real
 * action (a planting, a join) and must not be able to roll it back.
 */
export async function recordGroupActivity(
  db: Tx,
  groupId: string,
  type: GroupActivityType,
  actorId: string | null,
  data?: Prisma.InputJsonValue,
): Promise<void> {
  try {
    await db.plantingGroupActivity.create({ data: { groupId, type, actorId, data } });
  } catch (error) {
    console.warn('[group-activity] could not record activity:', error);
  }
}
