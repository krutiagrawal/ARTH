import { PrismaClient } from '@plant/db';
import { NotFoundError } from '../utils/errors';
import { requireNgoProfile } from './ngo.service';

interface CreateStaffInput {
  name: string;
  role: string;
  contactEmail?: string;
  contactPhone?: string;
  sortOrder?: number;
  photoUrl?: string;
}

interface UpdateStaffInput {
  name?: string;
  role?: string;
  contactEmail?: string;
  contactPhone?: string;
  sortOrder?: number;
  photoUrl?: string;
}

async function findOwnedStaffOrThrow(prisma: PrismaClient, ngoUserId: string, staffId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const staff = await prisma.staffMember.findFirst({ where: { id: staffId, ngoId: ngo.id } });
  if (!staff) throw new NotFoundError('Staff member not found');
  return staff;
}

export async function listOwnStaff(prisma: PrismaClient, ngoUserId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  return prisma.staffMember.findMany({ where: { ngoId: ngo.id }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
}

export async function createStaff(prisma: PrismaClient, ngoUserId: string, input: CreateStaffInput) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  return prisma.staffMember.create({ data: { ngoId: ngo.id, ...input } });
}

export async function updateStaff(prisma: PrismaClient, ngoUserId: string, staffId: string, input: UpdateStaffInput) {
  const staff = await findOwnedStaffOrThrow(prisma, ngoUserId, staffId);
  return prisma.staffMember.update({ where: { id: staff.id }, data: input });
}

export async function deleteStaff(prisma: PrismaClient, ngoUserId: string, staffId: string) {
  const staff = await findOwnedStaffOrThrow(prisma, ngoUserId, staffId);
  await prisma.staffMember.delete({ where: { id: staff.id } });
}
