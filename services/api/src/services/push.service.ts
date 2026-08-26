import { PrismaClient } from '@plant/db';
import { env } from '../config/env';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Expo's documented ceiling per request.
const BATCH_SIZE = 100;

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  details?: { error?: string };
}

/**
 * Best-effort delivery to Expo's push service.
 *
 * Nothing here is allowed to fail the request that triggered it — a like should still be recorded
 * when Expo is down, and the in-app notification row has already been written by the time this
 * runs. Every path is therefore wrapped and swallowed, with the failure logged rather than thrown.
 *
 * Disabled by default via EXPO_PUSH_ENABLED, because push is a no-op in Expo Go on iOS (Expo
 * removed it in SDK 53) and a dev build is needed to exercise it for real.
 */
export async function sendPush(
  prisma: PrismaClient,
  userIds: string[],
  message: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  if (env.EXPO_PUSH_ENABLED !== 'true' || userIds.length === 0) return;

  try {
    const tokens = await prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const messages: ExpoMessage[] = tokens.map((t) => ({
      to: t.token,
      title: message.title,
      body: message.body,
      data: message.data,
      sound: 'default',
    }));

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });

      if (!response.ok) continue;

      const payload = (await response.json()) as { data?: ExpoTicket[] };
      const tickets = payload.data ?? [];

      // A token the device no longer owns will keep failing forever; drop it so the table
      // doesn't fill with dead entries and every send doesn't pay for them.
      const dead = tickets
        .map((ticket, idx) => (ticket.details?.error === 'DeviceNotRegistered' ? batch[idx].to : null))
        .filter((t): t is string => t !== null);

      if (dead.length) {
        await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
      }
    }
  } catch (error) {
    console.warn('[push] delivery failed (notifications were still recorded):', error);
  }
}

export async function registerPushToken(
  prisma: PrismaClient,
  userId: string,
  token: string,
  platform: string,
) {
  // Tokens migrate between accounts when two people share a device, so the unique token wins
  // and its owner is reassigned rather than the insert failing.
  await prisma.pushToken.upsert({
    where: { token },
    create: { userId, token, platform },
    update: { userId, platform, lastSeenAt: new Date() },
  });
}

export async function removePushToken(prisma: PrismaClient, userId: string, token: string) {
  await prisma.pushToken.deleteMany({ where: { userId, token } });
}
