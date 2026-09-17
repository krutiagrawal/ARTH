import { PrismaClient } from '@plant/db';
import { recomputeReputation } from '../services/ngoReputation.service';

// Trust Score / Growth Level are recomputed inline at every activity hook (immediate feedback),
// but some inputs move with no new activity at all — tenure crossing a month boundary, update
// freshness decaying as a "met" week ages out of the rolling window. This is the catch-up pass.
// Mirrors nurseryReputation.job.ts, offset an hour later so the two don't both hit the DB with a
// full-table scan + per-row transaction in the same tick.
const RUN_ON_UTC_DAY = 1; // Monday
const RUN_START_UTC_HOUR = 3;
const RUN_END_UTC_HOUR = 4;

export async function runNgoReputationJob(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  if (now.getUTCDay() !== RUN_ON_UTC_DAY) return;
  const hour = now.getUTCHours();
  if (hour < RUN_START_UTC_HOUR || hour >= RUN_END_UTC_HOUR) return;

  try {
    const ngos = await prisma.ngoProfile.findMany({ where: { status: 'approved' }, select: { id: true } });
    for (const ngo of ngos) {
      await prisma.$transaction((tx) => recomputeReputation(tx, ngo.id));
    }
  } catch (error) {
    console.warn('[jobs] ngo-reputation failed:', error);
  }
}
