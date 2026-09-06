import { PrismaClient } from '@plant/db';
import { ConflictError, NotFoundError } from '../utils/errors';

export async function listWishlist(prisma: PrismaClient, userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      nursery: { select: { id: true, nurseryName: true, logoUrl: true, avgRating: true } },
      stock: { select: { id: true, species: true, priceCents: true, quantity: true, nursery: { select: { id: true, nurseryName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
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
