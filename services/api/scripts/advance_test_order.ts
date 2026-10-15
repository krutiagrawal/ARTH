import { PrismaClient } from '@arth/db';

const prisma = new PrismaClient();

// Test helper: moves one of the krutii account's orders to packed / ready_for_pickup so the
// "Contact nursery" cancellation flow can be tried by hand.
//
//   npx tsx scripts/advance_test_order.ts                 # list krutii's orders
//   npx tsx scripts/advance_test_order.ts <orderId> [packed|ready_for_pickup]   # default packed (ready_for_pickup only makes sense for pickup orders)

async function main() {
  const me = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { contains: 'krutii', mode: 'insensitive' } },
        { handle: { contains: 'krutii', mode: 'insensitive' } },
        { name: { contains: 'krutii', mode: 'insensitive' } },
      ],
    },
  });
  if (!me) throw new Error('krutii account not found');

  const id = process.argv[2];
  if (!id) {
    const orders = await prisma.order.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true, nursery: { select: { nurseryName: true } } },
    });
    for (const o of orders) {
      console.log(`${o.id}  ${o.status.padEnd(18)} ${o.fulfillmentType.padEnd(9)} ${o.nursery.nurseryName}  ${o.items.map((i) => `${i.species}×${i.quantity}`).join(', ')}`);
    }
    return;
  }

  const order = await prisma.order.findFirst({ where: { id, userId: me.id } });
  if (!order) throw new Error('Order not found for this account');
  if (['cancelled', 'delivered', 'picked_up', 'plantation_verified'].includes(order.status)) {
    throw new Error(`Order is ${order.status}; pick one that is still open`);
  }
  const stage = process.argv[3] === 'ready_for_pickup' ? 'ready_for_pickup' : 'packed';
  const now = new Date();
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: stage,
      confirmedAt: order.confirmedAt ?? now,
      packedAt: order.packedAt ?? now,
      ...(stage === 'ready_for_pickup' ? { readyForPickupAt: now } : {}),
      handoffCode: order.handoffCode ?? String(Math.floor(1000 + Math.random() * 9000)),
    },
  });
  console.log(`Order ${updated.id} is now ${updated.status} (${updated.fulfillmentType})`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
