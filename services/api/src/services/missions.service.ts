import { Prisma, MissionType } from '@plant/db';
import { addXp } from './xp.service';

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function getOrCreateTodayMissions(tx: Prisma.TransactionClient, userId: string) {
  const today = startOfUtcDay(new Date());
  const templates = await tx.dailyMission.findMany({ where: { isActive: true } });

  const rows = await Promise.all(
    templates.map((template) =>
      tx.userDailyMission.upsert({
        where: { userId_missionId_missionDate: { userId, missionId: template.id, missionDate: today } },
        update: {},
        create: { userId, missionId: template.id, missionDate: today },
        include: { mission: true },
      })
    )
  );

  return rows;
}

export async function completeMissionByType(tx: Prisma.TransactionClient, userId: string, type: MissionType) {
  const today = startOfUtcDay(new Date());
  const rows = await getOrCreateTodayMissions(tx, userId);
  const match = rows.find((row) => row.mission.type === type && !row.completed);
  if (!match) return;

  await tx.userDailyMission.update({
    where: { id: match.id },
    data: { completed: true, completedAt: new Date() },
  });

  await addXp(tx, userId, match.mission.xpReward, 'mission_completed', 'mission', match.mission.id);
}

export async function completeMissionById(tx: Prisma.TransactionClient, userId: string, missionId: string) {
  const today = startOfUtcDay(new Date());
  const row = await tx.userDailyMission.findUnique({
    where: { userId_missionId_missionDate: { userId, missionId, missionDate: today } },
    include: { mission: true },
  });

  if (!row || row.completed) return row;

  const updated = await tx.userDailyMission.update({
    where: { id: row.id },
    data: { completed: true, completedAt: new Date() },
    include: { mission: true },
  });

  await addXp(tx, userId, row.mission.xpReward, 'mission_completed', 'mission', row.mission.id);
  return updated;
}
