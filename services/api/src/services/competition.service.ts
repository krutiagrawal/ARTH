import { PrismaClient, Prisma } from '@plant/db';
import { ConflictError, NotFoundError } from '../utils/errors';

export function listCompetitions(prisma: PrismaClient) {
  return prisma.competition.findMany({ orderBy: { deadline: 'asc' } });
}

export function getCompetition(prisma: PrismaClient, id: string) {
  return prisma.competition.findUnique({ where: { id } });
}

export function listEntries(prisma: PrismaClient, competitionId: string) {
  return prisma.competitionEntry.findMany({
    where: { competitionId },
    include: { user: { select: { name: true, avatarEmoji: true } } },
    orderBy: { votesCount: 'desc' },
  });
}

export async function submitEntry(
  prisma: PrismaClient,
  competitionId: string,
  userId: string,
  input: { title: string; description: string; imageUrl?: string },
) {
  const competition = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!competition) throw new NotFoundError('Competition not found');

  const [entry] = await prisma.$transaction([
    prisma.competitionEntry.create({
      data: {
        competitionId,
        userId,
        title: input.title,
        description: input.description,
        imageUrl: input.imageUrl ?? null,
      },
    }),
    prisma.competition.update({ where: { id: competitionId }, data: { entriesCount: { increment: 1 } } }),
  ]);

  return entry;
}

export function listMyEntries(prisma: PrismaClient, userId: string) {
  return prisma.competitionEntry.findMany({
    where: { userId },
    include: { competition: { select: { title: true, deadline: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function listMyVotes(prisma: PrismaClient, userId: string) {
  return prisma.competitionEntryVote.findMany({
    where: { userId },
    include: { entry: { include: { competition: { select: { title: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function voteForEntry(prisma: PrismaClient, entryId: string, userId: string) {
  try {
    const [, entry] = await prisma.$transaction([
      prisma.competitionEntryVote.create({ data: { entryId, userId } }),
      prisma.competitionEntry.update({ where: { id: entryId }, data: { votesCount: { increment: 1 } } }),
    ]);
    return entry;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') throw new ConflictError('You have already voted for this entry');
      if (err.code === 'P2025') throw new NotFoundError('Entry not found');
    }
    throw err;
  }
}
