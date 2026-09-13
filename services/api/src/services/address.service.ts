import { PrismaClient, Prisma } from '@plant/db';
import { ForbiddenError, NotFoundError } from '../utils/errors';

interface UpsertAddressInput {
  label?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

// Orders still in flight for a delivery — deliberately excludes pickup orders (no addressId to
// reassign) and the terminal states (delivered/plantation_verified/cancelled), whose delivery
// address is history and shouldn't retroactively change. Includes out_for_delivery on purpose:
// the product decision here is that a customer's current default address always wins, even mid-
// delivery, in exchange for the (accepted) risk that an already-dispatched partner isn't
// re-notified of the change — there's no push infra to do that today.
const ACTIVE_DELIVERY_STATUSES: Prisma.OrderWhereInput['status'] = {
  in: ['pending_payment', 'confirmed', 'packed', 'out_for_delivery'],
};

// Keeps every in-flight order's delivery destination pinned to whatever the customer currently
// has marked as their default address, rather than freezing it at whatever was default at
// checkout — so setting a new default retroactively redirects orders already placed.
async function reassignActiveOrdersToAddress(tx: Prisma.TransactionClient, userId: string, addressId: string) {
  await tx.order.updateMany({
    where: { userId, fulfillmentType: 'delivery', status: ACTIVE_DELIVERY_STATUSES },
    data: { addressId },
  });
}

export async function listAddresses(prisma: PrismaClient, userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
}

// The first address a user ever saves becomes their default automatically — nobody should have
// to remember to flip that toggle just to check out once.
export async function createAddress(prisma: PrismaClient, userId: string, input: UpsertAddressInput) {
  const existingCount = await prisma.address.count({ where: { userId } });
  const makeDefault = input.isDefault === true || existingCount === 0;

  return prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    const address = await tx.address.create({ data: { userId, ...input, isDefault: makeDefault } });
    if (makeDefault) await reassignActiveOrdersToAddress(tx, userId, address.id);
    return address;
  });
}

export async function updateAddress(prisma: PrismaClient, userId: string, addressId: string, input: Partial<UpsertAddressInput>) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw new NotFoundError('Address not found');

  return prisma.$transaction(async (tx) => {
    if (input.isDefault === true) {
      await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      await reassignActiveOrdersToAddress(tx, userId, addressId);
    }
    return tx.address.update({ where: { id: addressId }, data: input });
  });
}

export async function deleteAddress(prisma: PrismaClient, userId: string, addressId: string) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw new NotFoundError('Address not found');

  const inUse = await prisma.order.findFirst({ where: { addressId } });
  if (inUse) throw new ForbiddenError('This address is attached to a past order and cannot be deleted');

  await prisma.address.delete({ where: { id: addressId } });

  if (address.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (next) {
      await prisma.$transaction(async (tx) => {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
        await reassignActiveOrdersToAddress(tx, userId, next.id);
      });
    }
  }
}
