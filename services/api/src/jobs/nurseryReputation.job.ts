import { PrismaClient } from '@plant/db';
import { recomputeReputation } from '../services/nurseryReputation.service';

// Trust Score / Growth Level are recomputed inline at every activity hook (immediate feedback),
// but some inputs move with no new activity at all — tenure crossing a month boundary, inventory
// freshness decaying as a "met" week ages out of the rolling window. This is the catch-up pass.
// No cron lib exists (see scheduler.ts) — self-gates to a single Monday early-UTC hour so the
// 15-min tick loop doesn't recompute the same idempotent numbers 90+ times a week for nothing.
const RUN_ON_UTC_DAY = 1; // Monday
const RUN_START_UTC_HOUR = 2;
const RUN_END_UTC_HOUR = 3;

export async function runNurseryReputationJob(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  if (now.getUTCDay() !== RUN_ON_UTC_DAY) return;
  const hour = now.getUTCHours();
  if (hour < RUN_START_UTC_HOUR || hour >= RUN_END_UTC_HOUR) return;

  try {
    const nurseries = await prisma.nurseryProfile.findMany({ where: { status: 'approved' }, select: { id: true } });
    for (const nursery of nurseries) {
      await prisma.$transaction((tx) => recomputeReputation(tx, nursery.id));
    }
  } catch (error) {
    console.warn('[jobs] nursery-reputation failed:', error);
  }
}
