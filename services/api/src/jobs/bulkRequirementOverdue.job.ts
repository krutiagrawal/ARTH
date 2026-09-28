import { PrismaClient } from '@arth/db';
import { notify } from '../services/notification.service';

/** BulkRequirements whose neededByDate has fully passed (the due date's own day still counts as
 * on-time) without being fulfilled — flips them to 'expired' and notifies the NGO, once. Unlike
 * zoneHealthCheckReminders.job.ts's threshold-based reminders, this is a one-time terminal-ish
 * transition, so the status change itself is the dedupe: once a row leaves the
 * open/partially_fulfilled set, this job's own filter naturally never re-selects it again — no
 * separate Notification.data dedupe check needed. */
export async function runBulkRequirementOverdueJob(prisma: PrismaClient): Promise<void> {
  try {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const overdue = await prisma.bulkRequirement.findMany({
      where: { status: { in: ['open', 'partially_fulfilled'] }, neededByDate: { lt: startOfToday } },
      select: {
        id: true,
        quantityNeeded: true,
        quantityFulfilled: true,
        neededByDate: true,
        species: { select: { commonName: true } },
        speciesNote: true,
        ngo: { select: { userId: true } },
      },
    });
    if (overdue.length === 0) return;

    // Flip status first — re-checking the same filter at execution time — so a slow notify() or
    // an overlapping request against one of these rows can't cause it to be reprocessed.
    await prisma.bulkRequirement.updateMany({
      where: { id: { in: overdue.map((r) => r.id) }, status: { in: ['open', 'partially_fulfilled'] } },
      data: { status: 'expired' },
    });

    for (const req of overdue) {
      const speciesLabel = req.species?.commonName ?? req.speciesNote ?? 'saplings';
      await notify(prisma, {
        userId: req.ngo.userId,
        type: 'bulk_requirement_deadline_passed',
        data: { requirementId: req.id, quantityNeeded: req.quantityNeeded, quantityFulfilled: req.quantityFulfilled, species: speciesLabel },
        push: {
          title: 'Bulk requirement deadline passed',
          body: `Your request for ${req.quantityNeeded} ${speciesLabel} (${req.quantityFulfilled}/${req.quantityNeeded} fulfilled) wasn't completed in time. Want to reschedule?`,
        },
      });
    }
  } catch (error) {
    console.warn('[jobs] bulk-requirement-overdue failed:', error);
  }
}
