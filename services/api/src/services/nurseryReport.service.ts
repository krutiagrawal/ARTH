import { PrismaClient } from '@arth/db';
import { bucketize, resolveReportRange } from '../utils/reportRange';

export interface NurseryReportParams {
  from?: Date;
  to?: Date;
  fulfillmentType?: 'pickup' | 'delivery';
  /** Narrows orders to those containing this species (case-insensitive contains). */
  species?: string;
}

const COMPLETED = ['picked_up', 'delivered', 'plantation_verified'] as const;
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);
const round1 = (n: number) => Math.round(n * 10) / 10;

interface Window {
  from: Date;
  to: Date;
}

function orderWhere(nurseryId: string, w: Window, p: NurseryReportParams) {
  return {
    nurseryId,
    // Unpaid carts aren't orders yet.
    status: { not: 'pending_payment' as const },
    createdAt: { gte: w.from, lte: w.to },
    ...(p.fulfillmentType ? { fulfillmentType: p.fulfillmentType } : {}),
    ...(p.species ? { items: { some: { species: { contains: p.species, mode: 'insensitive' as const } } } } : {}),
  };
}

/** Headline numbers for one window; run for the selected range and the previous one for the ▲/▼ comparison. */
async function computeKpis(prisma: PrismaClient, nurseryId: string, w: Window, p: NurseryReportParams) {
  const [orders, reviews] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere(nurseryId, w, p),
      select: { status: true, totalCents: true, cancellationFeeCents: true, userId: true, items: { select: { quantity: true } } },
    }),
    prisma.orderReview.findMany({ where: { nurseryId, createdAt: { gte: w.from, lte: w.to } }, select: { nurseryRating: true } }),
  ]);

  const completed = orders.filter((o) => (COMPLETED as readonly string[]).includes(o.status));
  const cancelled = orders.filter((o) => o.status === 'cancelled');
  const revenueCents = completed.reduce((n, o) => n + o.totalCents, 0);

  const customerIds = Array.from(new Set(orders.map((o) => o.userId)));
  const returning = customerIds.length
    ? await prisma.order.findMany({
        where: { nurseryId, userId: { in: customerIds }, status: { not: 'pending_payment' }, createdAt: { lt: w.from } },
        select: { userId: true },
        distinct: ['userId'],
      })
    : [];

  return {
    orders: orders.length,
    revenueCents,
    avgOrderValueCents: completed.length ? Math.round(revenueCents / completed.length) : 0,
    saplingsSold: completed.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0),
    fulfilmentRate: pct(completed.length, completed.length + cancelled.length),
    cancellationRate: pct(cancelled.length, orders.length),
    cancellationFeesCents: cancelled.reduce((n, o) => n + o.cancellationFeeCents, 0),
    avgRating: reviews.length ? round1(reviews.reduce((n, r) => n + r.nurseryRating, 0) / reviews.length) : null,
    reviews: reviews.length,
    newCustomers: customerIds.length - returning.length,
    returningCustomers: returning.length,
  };
}

/**
 * The nursery Reports payload for a date range: KPIs (with the previous equal-length period),
 * time series, and breakdowns for sales, stock, ratings, bulk requests and delivery partners.
 * Dates use the order's creation day.
 */
export async function getNurseryReport(prisma: PrismaClient, nurseryId: string, params: NurseryReportParams = {}) {
  const nursery = await prisma.nurseryProfile.findUniqueOrThrow({ where: { id: nurseryId }, select: { createdAt: true } });
  const range = resolveReportRange(params.from, params.to, nursery.createdAt);
  const inRange = { gte: range.from, lte: range.to };

  const [kpis, previousKpis] = await Promise.all([
    computeKpis(prisma, nurseryId, range, params),
    range.previous ? computeKpis(prisma, nurseryId, range.previous, params) : Promise.resolve(null),
  ]);

  const [orders, reviews, ledger, bulk, stockNow, partnerOrders] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere(nurseryId, range, params),
      select: { id: true, status: true, totalCents: true, createdAt: true, fulfillmentType: true, items: { select: { species: true, quantity: true, unitPriceCents: true } } },
    }),
    prisma.orderReview.findMany({
      where: { nurseryId, createdAt: inRange },
      select: { nurseryRating: true, nurseryResponse: true },
    }),
    prisma.saplingStockLedger.findMany({ where: { nurseryId, createdAt: inRange }, select: { delta: true, reason: true } }),
    prisma.bulkRequirementResponse.groupBy({ by: ['status'], where: { nurseryId, createdAt: inRange }, _count: { _all: true } }),
    prisma.saplingStock.findMany({ where: { nurseryId, archivedAt: null }, select: { quantity: true, lowStockThreshold: true } }),
    prisma.order.findMany({
      where: {
        nurseryId,
        status: { in: [...COMPLETED] },
        createdAt: inRange,
        tracking: { is: { deliveryPartnerId: { not: null } } },
      },
      select: { tracking: { select: { deliveryPartner: { select: { id: true, avgRating: true, user: { select: { name: true } } } } } } },
    }),
  ]);

  const completed = orders.filter((o) => (COMPLETED as readonly string[]).includes(o.status));

  // ---- species ----
  const species = new Map<string, { quantity: number; revenueCents: number }>();
  for (const o of completed) {
    for (const i of o.items) {
      const s = species.get(i.species) ?? { quantity: 0, revenueCents: 0 };
      s.quantity += i.quantity;
      s.revenueCents += i.quantity * i.unitPriceCents;
      species.set(i.species, s);
    }
  }

  // ---- order splits ----
  const byStatus: Record<string, number> = {};
  const byFulfilment: Record<string, number> = { pickup: 0, delivery: 0 };
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    byFulfilment[o.fulfillmentType] = (byFulfilment[o.fulfillmentType] ?? 0) + 1;
  }

  // ---- stock movement ----
  const GIVEN_OUT = ['reservation_fulfilled', 'order_placed', 'bulk_requirement_fulfilled'];
  const added = ledger.filter((l) => l.delta > 0 && l.reason !== 'order_cancelled').reduce((n, l) => n + l.delta, 0);
  const restocked = ledger.filter((l) => l.reason === 'order_cancelled').reduce((n, l) => n + l.delta, 0);
  const givenOut = ledger.filter((l) => GIVEN_OUT.includes(l.reason)).reduce((n, l) => n + Math.abs(l.delta), 0);
  let low = 0;
  let out = 0;
  for (const s of stockNow) {
    if (s.quantity <= 0) out += 1;
    else if (s.quantity <= s.lowStockThreshold) low += 1;
  }

  // ---- ratings ----
  const distribution = [1, 2, 3, 4, 5].map((stars) => ({ stars, count: reviews.filter((r) => r.nurseryRating === stars).length }));

  // ---- delivery partners ----
  const partners = new Map<string, { name: string; deliveries: number; avgRating: number | null }>();
  for (const o of partnerOrders) {
    const dp = o.tracking?.deliveryPartner;
    if (!dp) continue;
    const p = partners.get(dp.id) ?? { name: dp.user.name, deliveries: 0, avgRating: dp.avgRating != null ? Number(dp.avgRating) : null };
    p.deliveries += 1;
    partners.set(dp.id, p);
  }

  return {
    range: { from: range.from, to: range.to, granularity: range.granularity, allTime: range.allTime },
    filters: { fulfillmentType: params.fulfillmentType ?? null, species: params.species ?? null },
    kpis,
    previousKpis,
    series: {
      revenue: bucketize(completed, range, (o) => o.createdAt, (o) => o.totalCents),
      orders: bucketize(orders, range, (o) => o.createdAt),
    },
    sales: {
      topSpecies: Array.from(species.entries())
        .map(([name, v]) => ({ species: name, quantity: v.quantity, revenueCents: v.revenueCents }))
        .sort((a, b) => b.revenueCents - a.revenueCents)
        .slice(0, 8),
      byStatus,
      byFulfilment,
    },
    stock: {
      added,
      givenOut,
      restocked,
      current: { species: stockNow.length, low, out },
    },
    ratings: {
      average: kpis.avgRating,
      total: reviews.length,
      distribution,
      responseRate: pct(reviews.filter((r) => !!r.nurseryResponse).length, reviews.length),
    },
    bulkRequirements: Object.fromEntries(bulk.map((g) => [g.status, g._count._all])),
    deliveryPartners: Array.from(partners.values()).sort((a, b) => b.deliveries - a.deliveries).slice(0, 5),
  };
}
