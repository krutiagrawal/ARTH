import { Prisma, XpReason } from '@plant/db';

const XP_PER_LEVEL = 500;

export async function addXp(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  reason: XpReason,
  referenceType?: string,
  referenceId?: string
) {
  const user = await tx.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
  });

  await tx.xpTransaction.create({
    data: {
      userId,
      amount,
      reason,
      referenceType,
      referenceId,
      balanceAfter: user.xp,
    },
  });

  const newLevel = Math.floor(user.xp / XP_PER_LEVEL) + 1;
  if (newLevel !== user.level) {
    return tx.user.update({ where: { id: userId }, data: { level: newLevel } });
  }

  return user;
}
