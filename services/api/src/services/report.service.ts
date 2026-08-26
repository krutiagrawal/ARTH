import { Prisma, PrismaClient, ReportReason, ReportStatus, ReportTargetType } from '@plant/db';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { applyAutoHideIfNeeded } from './post.service';
import { notify } from './notification.service';

interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

/** Confirms the reported thing actually exists, so the queue can't fill with phantom rows. */
async function assertTargetExists(prisma: PrismaClient, targetType: ReportTargetType, targetId: string) {
  const exists = await (async () => {
    switch (targetType) {
      case 'post':
        return prisma.post.findUnique({ where: { id: targetId }, select: { id: true } });
      case 'story':
        return prisma.story.findUnique({ where: { id: targetId }, select: { id: true } });
      case 'user':
        return prisma.user.findFirst({ where: { id: targetId, isDeleted: false }, select: { id: true } });
      case 'ngo':
        return prisma.ngoProfile.findUnique({ where: { id: targetId }, select: { id: true } });
      case 'portfolio_entry':
        return prisma.ngoPortfolioEntry.findUnique({ where: { id: targetId }, select: { id: true } });
    }
  })();

  if (!exists) throw new NotFoundError('That content no longer exists');
}

export async function createReport(prisma: PrismaClient, reporterId: string, input: ReportInput) {
  await assertTargetExists(prisma, input.targetType, input.targetId);

  if (input.targetType === 'user' && input.targetId === reporterId) {
    throw new BadRequestError('You cannot report yourself');
  }

  try {
    await prisma.contentReport.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        // Mirrored into a real FK for posts so deleting a post takes its reports with it.
        postId: input.targetType === 'post' ? input.targetId : null,
        reason: input.reason,
        details: input.details,
      },
    });
  } catch (error) {
    // The unique index makes a second report from the same person a no-op rather than an error —
    // re-reporting should feel like it worked, not like a failure, and it must not be a way to
    // push a post past the auto-hide threshold single-handedly.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    return;
  }

  if (input.targetType === 'post') {
    await applyAutoHideIfNeeded(prisma, input.targetId);
  }
}

function serializeReport(r: any) {
  return {
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt,
    reporter: r.reporter
      ? { id: r.reporter.id, name: r.reporter.name, handle: r.reporter.handle }
      : null,
    reviewedBy: r.reviewedBy ? { id: r.reviewedBy.id, name: r.reviewedBy.name } : null,
    // Enough of the target to render the queue row without a second request. Null once the
    // content has been deleted — the row stays so the audit trail survives.
    post: r.post
      ? {
          id: r.post.id,
          caption: r.post.caption,
          isHidden: r.post.isHidden,
          thumbnailUrl: r.post.media?.[0]?.url ?? null,
          authorName: r.post.ngo?.orgName ?? r.post.user?.name ?? null,
        }
      : null,
  };
}

export async function listReports(
  prisma: PrismaClient,
  filter: { status?: ReportStatus; page?: number; take?: number } = {},
) {
  const take = Math.min(filter.take ?? 25, 100);
  const page = Math.max(filter.page ?? 1, 1);
  const where: Prisma.ContentReportWhereInput = filter.status ? { status: filter.status } : {};

  const [rows, total, openCount] = await Promise.all([
    prisma.contentReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
      include: {
        reporter: { select: { id: true, name: true, handle: true } },
        reviewedBy: { select: { id: true, name: true } },
        post: {
          select: {
            id: true,
            caption: true,
            isHidden: true,
            media: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
            ngo: { select: { orgName: true } },
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.contentReport.count({ where }),
    prisma.contentReport.count({ where: { status: 'open' } }),
  ]);

  return { total, openCount, reports: rows.map(serializeReport) };
}

export type ModerationAction = 'hide' | 'unhide' | 'delete' | 'dismiss';

/**
 * Resolves a report and applies the chosen action to its target.
 *
 * Every branch writes an AdminActionLog entry, matching how NGO approvals are audited, and tells
 * the reporter what came of their report.
 */
export async function actOnReport(
  prisma: PrismaClient,
  adminUserId: string,
  reportId: string,
  action: ModerationAction,
  reason?: string,
) {
  const report = await prisma.contentReport.findUnique({ where: { id: reportId } });
  if (!report) throw new NotFoundError('Report not found');

  if (report.targetType === 'post') {
    const post = await prisma.post.findUnique({ where: { id: report.targetId }, select: { id: true } });
    if (post) {
      if (action === 'hide') await prisma.post.update({ where: { id: post.id }, data: { isHidden: true } });
      if (action === 'unhide') await prisma.post.update({ where: { id: post.id }, data: { isHidden: false } });
      if (action === 'delete') await prisma.post.delete({ where: { id: post.id } });
    }
  } else if (report.targetType === 'story' && action === 'delete') {
    await prisma.story.deleteMany({ where: { id: report.targetId } });
  }

  // Deleting a post cascades its reports away, so only update rows that still exist.
  const stillThere = await prisma.contentReport.findUnique({ where: { id: reportId }, select: { id: true } });
  if (stillThere) {
    await prisma.contentReport.update({
      where: { id: reportId },
      data: {
        status: action === 'dismiss' ? 'dismissed' : 'actioned',
        reviewedByUserId: adminUserId,
        reviewedAt: new Date(),
      },
    });
  }

  await prisma.adminActionLog.create({
    data: {
      actorUserId: adminUserId,
      action: `report.${action}`,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: reason ?? null,
    },
  });

  await notify(prisma, {
    userId: report.reporterId,
    type: 'report_resolved',
    data: { action, reason: reason ?? null, targetType: report.targetType },
  });
}
