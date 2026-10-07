import { PrismaClient } from '@arth/db';
import { ConflictError, NotFoundError } from '../utils/errors';
import { cursorArgs, toCursorPage, type CursorQuery } from '../utils/pagination';

export async function listWishlist(prisma: PrismaClient, userId: string, q: CursorQuery = {}) {
  const { take, args } = cursorArgs(q, 30);
  const rows = await prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      nursery: { select: { id: true, nurseryName: true, logoUrl: true, avgRating: true, status: true } },
      stock: { select: { id: true, species: true, priceCents: true, quantity: true, nursery: { select: { id: true, nurseryName: true, status: true } } } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...args,
  });
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;

  // A wishlisted nursery/stock item whose nursery has since been suspended shouldn't keep showing
  // up as if nothing happened — every other nursery-facing surface (browse, checkout) already
  // gates on approved status; this list was the one place that didn't.
  const visible = items
    .filter((item) => (item.nursery ?? item.stock?.nursery)?.status === 'approved')
    .map(({ nursery, stock, ...rest }) => ({
      ...rest,
      nursery: nursery ? { id: nursery.id, nurseryName: nursery.nurseryName, logoUrl: nursery.logoUrl, avgRating: nursery.avgRating } : null,
      stock: stock ? { ...stock, nursery: { id: stock.nursery.id, nurseryName: stock.nursery.nurseryName } } : null,
    }));
  // The cursor comes from the unfiltered page so hidden (suspended-nursery) rows can't stall paging.
  return { items: visible, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function addWishlistItem(prisma: PrismaClient, userId: string, input: { nurseryId?: string; stockId?: string }) {
  try {
    return await prisma.wishlistItem.create({ data: { userId, ...input } });
  } catch (err: any) {
    if (err?.code === 'P2002') throw new ConflictError('Already in your wishlist');
    throw err;
  }
}

export async function removeWishlistItem(prisma: PrismaClient, userId: string, itemId: string) {
  const item = await prisma.wishlistItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw new NotFoundError('Wishlist item not found');
  await prisma.wishlistItem.delete({ where: { id: itemId } });
}
