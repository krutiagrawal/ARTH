import crypto from 'node:crypto';
import { Prisma, PrismaClient } from '@arth/db';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { deleteUploadedFiles } from './upload.service';

// Orders that are paid but not yet handed over: deleting the account now would strand money and goods.
const IN_PROGRESS_ORDER = ['confirmed', 'packed', 'ready_for_pickup', 'out_for_delivery'] as const;

/**
 * Permanently erases a person's data (Play Store / DPDP "delete my account").
 *
 * The user row is kept as an anonymous tombstone ("Deleted user") so that orders, donations and receipts
 * other people and the tax rules depend on stay intact, but nothing in it identifies the person any more:
 * name, email, phone, handle, photo, bio, date of birth, addresses, messages, posts, stories, push tokens and
 * every login are removed. Donation records keep the amount, receipt number and donor PAN, which the receiving
 * NGO must retain for tax audits.
 *
 * Organisation accounts (NGO, nursery, corporate, group, delivery partner) are additionally taken offline and
 * lose their personal contact details; their legal registration details are retained for audit.
 */
export async function eraseAccount(prisma: PrismaClient, userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { ngoProfile: true, nurseryProfile: true, corporateProfile: true, groupProfile: true, deliveryPartnerProfile: true },
  });
  if (!user || user.isDeleted) throw new NotFoundError('Account not found');
  if (user.role === 'admin') throw new ForbiddenError('Admin accounts cannot be deleted here.');

  await assertNothingInProgress(prisma, user);

  // Collected inside the transaction, deleted from disk only after it commits.
  const filesToDelete: (string | null | undefined)[] = [user.avatarUrl];
  const tombstone = crypto.randomBytes(6).toString('hex');

  await prisma.$transaction(
    async (tx) => {
      // ---- Sign-in material: no login or token survives ----
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.pushToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });

      // ---- Shopping and saved items ----
      await tx.cartItem.deleteMany({ where: { userId } });
      await tx.wishlistItem.deleteMany({ where: { userId } });
      await tx.orderReview.updateMany({ where: { userId }, data: { comment: null } });
      await tx.order.updateMany({ where: { userId }, data: { customerNote: null } });

      // Addresses a past order points at can't be removed (the order keeps its row), so they are blanked.
      const usedAddressIds = (await tx.order.findMany({ where: { userId, addressId: { not: null } }, select: { addressId: true } })).map(
        (o) => o.addressId as string,
      );
      await tx.address.updateMany({
        where: { userId, id: { in: usedAddressIds } },
        data: { label: null, line1: 'Deleted', line2: null, landmark: null, pincode: '000000', lat: null, lng: null, isDefault: false },
      });
      await tx.address.deleteMany({ where: { userId, id: { notIn: usedAddressIds } } });

      // ---- Social: posts, stories, reactions, connections ----
      const posts = await tx.post.findMany({ where: { userId }, select: { media: { select: { url: true } } } });
      posts.forEach((p) => p.media.forEach((m) => filesToDelete.push(m.url)));
      await tx.post.deleteMany({ where: { userId } });
      const stories = await tx.story.findMany({ where: { userId }, select: { imageUrl: true } });
      stories.forEach((s) => filesToDelete.push(s.imageUrl));
      await tx.story.deleteMany({ where: { userId } });

      await tx.postLike.deleteMany({ where: { userId } });
      await tx.savedPost.deleteMany({ where: { userId } });
      await tx.storyLike.deleteMany({ where: { userId } });
      await tx.storyView.deleteMany({ where: { userId } });
      await tx.ngoPortfolioLike.deleteMany({ where: { userId } });
      await tx.competitionEntryVote.deleteMany({ where: { userId } });
      await tx.activityReaction.deleteMany({ where: { userId } });
      await tx.activityFeed.deleteMany({ where: { userId } });
      await tx.follow.deleteMany({ where: { followerId: userId } });
      await tx.friendship.deleteMany({ where: { OR: [{ requesterId: userId }, { addresseeId: userId }] } });
      await tx.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedUserId: userId }] } });
      await tx.groupMember.deleteMany({ where: { userId, role: { not: 'owner' } } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.notification.updateMany({ where: { actorUserId: userId }, data: { actorUserId: null } });

      // ---- Free text and contact details left on records other people rely on ----
      await tx.driveRsvp.updateMany({
        where: { userId },
        data: { phone: null, emergencyContactName: null, emergencyContactPhone: null, note: null, cancelNote: null },
      });
      await tx.donation.updateMany({ where: { userId }, data: { message: null } });
      await tx.adoption.updateMany({ where: { userId }, data: { message: null } });
      await tx.saplingReservation.updateMany({ where: { userId }, data: { message: null } });

      const observations = await tx.treeObservation.findMany({
        where: { observerUserId: userId, photoUrl: { not: null } },
        select: { photoUrl: true },
      });
      observations.forEach((o) => filesToDelete.push(o.photoUrl));
      await tx.treeObservation.updateMany({ where: { observerUserId: userId }, data: { note: null, photoUrl: null } });

      // ---- Trees stay (they are real environmental records) but stop pointing at a person ----
      const trees = await tx.tree.findMany({ where: { userId, photoUrl: { not: null } }, select: { photoUrl: true } });
      trees.forEach((t) => filesToDelete.push(t.photoUrl));
      await tx.tree.updateMany({ where: { userId }, data: { nickname: 'Tree', locationLabel: null, photoUrl: null } });
      // Rounded to ~100 m: a planting is very often at the planter's home.
      await tx.$executeRaw`UPDATE trees SET lat = ROUND(lat, 3), lng = ROUND(lng, 3) WHERE user_id = ${userId}`;

      // ---- Organisation profiles: taken offline, personal contacts removed ----
      if (user.ngoProfile) {
        const docs = await tx.ngoVerificationDocument.findMany({
          where: { ngoId: user.ngoProfile.id, docType: { in: ['authorization_proof', 'past_work_photo'] } },
          select: { id: true, fileUrl: true },
        });
        docs.forEach((d) => filesToDelete.push(d.fileUrl));
        await tx.ngoVerificationDocument.deleteMany({ where: { id: { in: docs.map((d) => d.id) } } });
        filesToDelete.push(user.ngoProfile.logoUrl);
        await tx.ngoProfile.update({
          where: { id: user.ngoProfile.id },
          data: {
            status: 'suspended',
            contactPhone: null,
            officialEmail: null,
            primaryContactName: null,
            primaryContactDesignation: null,
            primaryContactPhone: null,
            primaryContactEmail: null,
            officeBearers: Prisma.DbNull,
            socialMediaLinks: [],
            website: null,
            logoUrl: null,
          },
        });
      }
      if (user.nurseryProfile) {
        filesToDelete.push(user.nurseryProfile.logoUrl, user.nurseryProfile.coverPhotoUrl, user.nurseryProfile.verificationPhotoUrl);
        await tx.nurseryProfile.update({
          where: { id: user.nurseryProfile.id },
          data: {
            status: 'suspended',
            contactPhone: null,
            responsiblePersonName: null,
            responsiblePersonRole: null,
            responsiblePersonPhone: null,
            websiteUrl: null,
            logoUrl: null,
            coverPhotoUrl: null,
            verificationPhotoUrl: null,
          },
        });
      }
      if (user.corporateProfile) {
        filesToDelete.push(user.corporateProfile.logoUrl);
        await tx.corporateProfile.update({ where: { id: user.corporateProfile.id }, data: { status: 'suspended', logoUrl: null } });
      }
      if (user.groupProfile) {
        filesToDelete.push(user.groupProfile.logoUrl);
        await tx.groupProfile.update({
          where: { id: user.groupProfile.id },
          data: { status: 'suspended', logoUrl: null, inviteCode: `X${crypto.randomBytes(7).toString('hex').toUpperCase()}` },
        });
      }
      if (user.deliveryPartnerProfile) {
        filesToDelete.push(user.deliveryPartnerProfile.photoUrl);
        await tx.deliveryPartnerProfile.update({
          where: { id: user.deliveryPartnerProfile.id },
          data: { isActive: false, phone: 'deleted', photoUrl: null },
        });
      }

      // ---- Finally the account itself becomes an anonymous tombstone ----
      await tx.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          email: `deleted-${tombstone}@deleted.invalid`,
          phone: null,
          // A random hash nobody knows the password for, so the row can never be logged into.
          passwordHash: crypto.randomBytes(32).toString('hex'),
          name: 'Deleted user',
          handle: `deleted_${tombstone}`,
          bio: null,
          avatarEmoji: '🧑',
          avatarUrl: null,
          city: null,
          plantingSpace: [],
          gardeningExperience: null,
          motivation: [],
          dateOfBirth: null,
          speciesInterest: [],
          homeSunlight: null,
          plantingGoal: null,
          blockedReason: null,
        },
      });
    },
    { timeout: 30_000, maxWait: 10_000 },
  );

  await deleteUploadedFiles(filesToDelete);
}

async function assertNothingInProgress(
  prisma: PrismaClient,
  user: { id: string; ngoProfile: { id: string } | null; nurseryProfile: { id: string } | null; deliveryPartnerProfile: { id: string } | null },
) {
  const buying = await prisma.order.count({ where: { userId: user.id, status: { in: [...IN_PROGRESS_ORDER] } } });
  if (buying > 0) {
    throw new ConflictError(
      'You have an order that has been paid for but not yet delivered or picked up. Please wait until it is completed or cancel it, then delete your account.',
    );
  }

  if (user.nurseryProfile) {
    const selling = await prisma.order.count({ where: { nurseryId: user.nurseryProfile.id, status: { in: [...IN_PROGRESS_ORDER] } } });
    if (selling > 0) {
      throw new ConflictError('You still have customer orders to fulfil. Please complete or cancel them before deleting the account.');
    }
  }

  if (user.deliveryPartnerProfile) {
    const delivering = await prisma.deliveryTracking.count({
      where: { deliveryPartnerId: user.deliveryPartnerProfile.id, order: { status: 'out_for_delivery' } },
    });
    if (delivering > 0) throw new ConflictError('You have a delivery in progress. Please complete it before deleting the account.');
  }

  if (user.ngoProfile) {
    const upcoming = await prisma.drive.count({ where: { ngoId: user.ngoProfile.id, status: 'upcoming' } });
    if (upcoming > 0) throw new ConflictError('You have upcoming drives. Please cancel or complete them before deleting the account.');
    const campaigns = await prisma.donationCampaign.count({ where: { ngoId: user.ngoProfile.id, status: 'active' } });
    if (campaigns > 0) throw new ConflictError('You have active donation campaigns. Please close them before deleting the account.');
  }
}
