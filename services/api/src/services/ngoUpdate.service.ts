import { PrismaClient } from '@plant/db';
import { requireNgoProfile } from './ngo.service';
import { createPost, deletePost, serializePost, viewerInclude } from './post.service';

/**
 * Back-compat layer for `/api/ngo/updates` and the public per-NGO update feed.
 *
 * "NGO updates" are now ordinary NGO-authored Posts — this module is what keeps the older
 * endpoints (which the web dashboard's Updates page and public profile still call) working on
 * top of the new table. New surfaces should use post.service directly.
 */

interface CreateUpdateInput {
  caption?: string;
  driveId?: string;
  /** Single photo, as the legacy multipart route sends it. */
  photoUrl?: string;
}

interface Pagination {
  page?: number;
  take?: number;
}

export async function listOwnUpdates(prisma: PrismaClient, ngoUserId: string, filter: Pagination = {}) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const posts = await prisma.post.findMany({
    where: { ngoId: ngo.id },
    include: viewerInclude(ngoUserId),
    orderBy: { createdAt: 'desc' },
    take,
    skip: (page - 1) * take,
  });

  return posts.map((p) => serializePost(p as any, ngoUserId));
}

export async function createUpdate(prisma: PrismaClient, ngoUserId: string, input: CreateUpdateInput) {
  const post = await createPost(prisma, ngoUserId, {
    caption: input.caption,
    driveId: input.driveId,
    mediaUrls: input.photoUrl ? [input.photoUrl] : [],
    asNgo: true,
  });
  return serializePost(post as any, ngoUserId);
}

export async function deleteUpdate(prisma: PrismaClient, ngoUserId: string, updateId: string) {
  await deletePost(prisma, ngoUserId, updateId);
}

/** Public feed of one NGO's updates — used by the public profile page. */
export async function listPublicUpdates(prisma: PrismaClient, ngoId: string, filter: Pagination = {}) {
  const take = Math.min(filter.take ?? 20, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const posts = await prisma.post.findMany({
    where: { ngoId, isHidden: false, ngo: { status: 'approved' } },
    include: viewerInclude(),
    orderBy: { createdAt: 'desc' },
    take,
    skip: (page - 1) * take,
  });

  return posts.map((p) => serializePost(p as any));
}
