import { PrismaClient } from '@plant/db';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';

const cartInclude = {
  stock: { select: { id: true, species: true, priceCents: true, isFree: true, quantity: true } },
  nursery: { select: { id: true, nurseryName: true, logoUrl: true } },
} as const;

function serializeCartItem(item: any) {
  return {
    id: item.id,
    quantity: item.quantity,
    stockId: item.stockId,
    species: item.stock?.species,
    priceCents: item.stock?.priceCents ?? 0,
    availableQuantity: item.stock?.quantity ?? 0,
    nursery: item.nursery,
    lineTotalCents: (item.stock?.priceCents ?? 0) * item.quantity,
  };
}

export async function getMyCart(prisma: PrismaClient, userId: string) {
  const items = await prisma.cartItem.findMany({ where: { userId }, include: cartInclude, orderBy: { createdAt: 'asc' } });
  return {
    items: items.map(serializeCartItem),
    subtotalCents: items.reduce((sum, i) => sum + (i.stock?.priceCents ?? 0) * i.quantity, 0),
  };
}

// A cart holds stock from exactly one nursery at a time (see CartItem's schema comment) — adding
// from a second nursery replaces whatever was in the cart rather than silently merging two
// vendors into one checkout.
export async function addCartItem(prisma: PrismaClient, userId: string, stockId: string, quantity: number) {
  const stock = await prisma.saplingStock.findUnique({ where: { id: stockId }, include: { nursery: true } });
  if (!stock || stock.nursery.status !== 'approved' || stock.isFree) throw new NotFoundError('Sapling not found');
  if (quantity > stock.quantity) throw new BadRequestError('Not enough stock available');

  const existingFromOtherNursery = await prisma.cartItem.findFirst({
    where: { userId, NOT: { nurseryId: stock.nurseryId } },
  });
  if (existingFromOtherNursery) {
    await prisma.cartItem.deleteMany({ where: { userId } });
  }

  return prisma.cartItem.upsert({
    where: { userId_stockId: { userId, stockId } },
    create: { userId, nurseryId: stock.nurseryId, stockId, quantity },
    update: { quantity: { increment: quantity } },
    include: cartInclude,
  }).then(serializeCartItem);
}

export async function updateCartItem(prisma: PrismaClient, userId: string, itemId: string, quantity: number) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, userId }, include: { stock: true } });
  if (!item) throw new NotFoundError('Cart item not found');
  if (quantity > item.stock.quantity) throw new BadRequestError('Not enough stock available');

  return prisma.cartItem.update({ where: { id: itemId }, data: { quantity }, include: cartInclude }).then(serializeCartItem);
}

export async function removeCartItem(prisma: PrismaClient, userId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw new NotFoundError('Cart item not found');
  await prisma.cartItem.delete({ where: { id: itemId } });
}

export async function clearCart(prisma: PrismaClient, userId: string) {
  await prisma.cartItem.deleteMany({ where: { userId } });
}

/** Used by order.service.ts at checkout — throws if the cart is empty or spans nurseries. */
export async function requireCheckoutableCart(prisma: PrismaClient, userId: string) {
  const items = await prisma.cartItem.findMany({ where: { userId }, include: { stock: true, nursery: true } });
  if (items.length === 0) throw new BadRequestError('Your cart is empty');

  const nurseryId = items[0].nurseryId;
  if (items.some((i) => i.nurseryId !== nurseryId)) throw new ConflictError('Cart spans more than one nursery');
  if (items[0].nursery.status !== 'approved') throw new NotFoundError('Nursery not found');

  for (const item of items) {
    if (item.quantity > item.stock.quantity) {
      throw new BadRequestError(`Only ${item.stock.quantity} ${item.stock.species} left in stock`);
    }
  }

  return { items, nurseryId, nursery: items[0].nursery };
}
