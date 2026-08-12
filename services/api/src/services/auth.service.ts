import { PrismaClient, User } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiryDate,
} from '../utils/jwt';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
  handle: string;
  deviceInfo?: string;
}

interface LoginInput {
  email: string;
  password: string;
  deviceInfo?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function issueTokenPair(prisma: PrismaClient, user: User, deviceInfo?: string | null): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiryDate(),
      deviceInfo: deviceInfo ?? null,
    },
  });

  return { accessToken, refreshToken };
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    avatarEmoji: user.avatarEmoji,
    xp: user.xp,
    level: user.level,
    streakCurrent: user.streakCurrent,
    streakMax: user.streakMax,
    streakFreezesAvailable: user.streakFreezesAvailable,
    treesPlantedCount: user.treesPlantedCount,
    totalCo2Absorbed: Number(user.totalCo2Absorbed),
    badgesCount: user.badgesCount,
    selectedForestThemeId: user.selectedForestThemeId,
    createdAt: user.createdAt,
  };
}

export async function register(prisma: PrismaClient, input: RegisterInput) {
  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) throw new ConflictError('Email is already registered');

  const existingHandle = await prisma.user.findUnique({ where: { handle: input.handle } });
  if (existingHandle) throw new ConflictError('Handle is already taken');

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        passwordPlain: input.password,
        name: input.name,
        handle: input.handle,
      },
    });

    await tx.userSettings.create({ data: { userId: created.id } });

    const themes = await tx.forestTheme.findMany();
    if (themes.length > 0) {
      await tx.userForestTheme.createMany({
        data: themes.map((theme) => ({
          userId: created.id,
          themeId: theme.id,
          unlocked: theme.isDefaultUnlocked,
          unlockedAt: theme.isDefaultUnlocked ? new Date() : null,
        })),
      });

      const classicTheme = themes.find((t) => t.key === 'classic') ?? themes[0];
      await tx.user.update({
        where: { id: created.id },
        data: { selectedForestThemeId: classicTheme.id },
      });
    }

    const achievements = await tx.achievement.findMany();
    if (achievements.length > 0) {
      await tx.userAchievement.createMany({
        data: achievements.map((achievement) => ({
          userId: created.id,
          achievementId: achievement.id,
        })),
      });
    }

    return tx.user.findUniqueOrThrow({ where: { id: created.id } });
  });

  const tokens = await issueTokenPair(prisma, user, input.deviceInfo);
  return { user: toPublicUser(user), ...tokens };
}

export async function login(prisma: PrismaClient, input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || user.isDeleted) throw new UnauthorizedError('Invalid credentials');

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  const tokens = await issueTokenPair(prisma, updated, input.deviceInfo);
  return { user: toPublicUser(updated), ...tokens };
}

export async function refresh(prisma: PrismaClient, refreshTokenValue: string) {
  const tokenHash = hashRefreshToken(refreshTokenValue);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) throw new UnauthorizedError('Invalid refresh token');

  if (existing.revokedAt) {
    // Reuse of a revoked token indicates possible compromise — revoke the whole session family.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh token reuse detected; all sessions revoked');
  }

  if (existing.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!user || user.isDeleted) throw new UnauthorizedError('User not found');

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const newRefreshToken = generateRefreshToken();

  const newTokenRow = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(newRefreshToken),
      expiresAt: refreshTokenExpiryDate(),
      deviceInfo: existing.deviceInfo,
    },
  });

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(), replacedByTokenId: newTokenRow.id },
  });

  return { user: toPublicUser(user), accessToken, refreshToken: newRefreshToken };
}

export async function logout(prisma: PrismaClient, refreshTokenValue: string) {
  const tokenHash = hashRefreshToken(refreshTokenValue);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function logoutAll(prisma: PrismaClient, userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function listSessions(prisma: PrismaClient, userId: string) {
  const sessions = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, deviceInfo: true, createdAt: true, expiresAt: true },
  });
  return sessions;
}

export async function revokeSession(prisma: PrismaClient, userId: string, sessionId: string) {
  const result = await prisma.refreshToken.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) throw new NotFoundError('Session not found');
}
