import { PrismaClient } from '@plant/db';
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
    return tx.address.create({ data: { userId, ...input, isDefault: makeDefault } });
  });
}

export async function updateAddress(prisma: PrismaClient, userId: string, addressId: string, input: Partial<UpsertAddressInput>) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw new NotFoundError('Address not found');

  return prisma.$transaction(async (tx) => {
    if (input.isDefault === true) await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
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
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
}
