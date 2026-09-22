// One-off, idempotent backfill: creates the mirrored Post row for every pre-existing
// NgoPortfolioEntry that predates the postId link (added in migration
// portfolio_entry_linked_post), so past work already on a profile shows up in the Posts tab too,
// same as entries created going forward via portfolio.service.ts::createPortfolioEntry.
//
// Posts are created directly (not via post.service.ts::createPost) and dated by the entry's
// happenedOn, not "now" — a backfill isn't a real posting action, so it deliberately skips the
// streak/achievement/notification side effects and rate limiting that createPost applies to
// genuine new posts.
//
// Safe to re-run: only ever touches entries where postId is still null.
//
// Run with: npx tsx prisma/scripts/backfillPortfolioPosts.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function portfolioCaption(title: string, description?: string | null) {
  return description ? `${title}\n\n${description}` : title;
}

async function main() {
  const entries = await prisma.ngoPortfolioEntry.findMany({
    where: { postId: null },
    include: { media: { orderBy: { order: 'asc' } } },
  });
  console.log(
    `Backfilling posts for ${entries.length} past-work entr${entries.length === 1 ? 'y' : 'ies'} missing one...`,
  );

  let linked = 0;
  for (const entry of entries) {
    const post = await prisma.post.create({
      data: {
        authorType: 'ngo',
        ngoId: entry.ngoId,
        caption: portfolioCaption(entry.title, entry.description),
        createdAt: entry.happenedOn,
        media: { create: entry.media.map((m) => ({ url: m.url, order: m.order })) },
      },
    });
    await prisma.ngoPortfolioEntry.update({ where: { id: entry.id }, data: { postId: post.id } });
    linked += 1;
  }

  console.log(`Done. Linked ${linked} entr${linked === 1 ? 'y' : 'ies'} to a new Post.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
