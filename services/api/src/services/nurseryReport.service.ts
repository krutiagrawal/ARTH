import { Prisma, PrismaClient } from '@arth/db';
import { bucketize, resolveReportRange } from '../utils/reportRange';
import { cached, nurseryKey } from '../utils/ttlCache';

export interface NurseryReportParams {
  from?: Date;
  to?: Date;
  fulfillmentType?: 'pickup' | 'delivery';
  /** Narrows orders to those containing this species (case-insensitive contains). */
  species?: string;
}

const COMPLETED = ['picked_up', 'delivered', 'plantation_verified'] as const;
const REPORT_TTL_MS = 30_000;
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

/** Headline numbers for one window; run for the selected range and the previous one for the ▲/▼ comparison.
 * Everything is counted/summed in the database - no order or review rows are loaded. */
async function computeKpis(prisma: PrismaClient, nurseryId: string, w: Window, p: NurseryReportParams) {
  const where = orderWhere(nurseryId, w, p);
  const [byStatus, saplings, customers, reviewAgg] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { totalCents: true, cancellationFeeCents: true } }),
    prisma.orderItem.aggregate({ where: { order: { ...where, status: { in: [...COMPLETED] } } }, _sum: { quantity: true } }),
    prisma.order.findMany({ where, select: { userId: true }, distinct: ['userId'] }),
    prisma.orderReview.aggregate({
      where: { nurseryId, createdAt: { gte: w.from, lte: w.to } },
      _avg: { nurseryRating: true },
      _count: { _all: true },
    }),
  ]);

  let orders = 0;
  let completedCount = 0;
  let revenueCents = 0;
  let cancelledCount = 0;
  let cancellationFeesCents = 0;
  for (const g of byStatus) {
    orders += g._count._all;
    if ((COMPLETED as readonly string[]).includes(g.status)) {
      completedCount += g._count._all;
      revenueCents += g._sum.totalCents ?? 0;
    } else if (g.status === 'cancelled') {
      cancelledCount += g._count._all;
      cancellationFeesCents += g._sum.cancellationFeeCents ?? 0;
    }
  }

  const customerIds = customers.map((c) => c.userId);
  const returning = customerIds.length
    ? await prisma.order.findMany({
        where: { nurseryId, userId: { in: customerIds }, status: { not: 'pending_payment' }, createdAt: { lt: w.from } },
        select: { userId: true },
        distinct: ['userId'],
      })
    : [];

  const reviewCount = reviewAgg._count._all;
  return {
    orders,
    revenueCents,
    avgOrderValueCents: completedCount ? Math.round(revenueCents / completedCount) : 0,
    saplingsSold: saplings._sum.quantity ?? 0,
    fulfilmentRate: pct(completedCount, completedCount + cancelledCount),
    cancellationRate: pct(cancelledCount, orders),
    cancellationFeesCents,
    avgRating: reviewCount && reviewAgg._avg.nurseryRating != null ? round1(reviewAgg._avg.nurseryRating) : null,
    reviews: reviewCount,
    newCustomers: customerIds.length - returning.length,
    returningCustomers: returning.length,
  };
}

/**
 * The nursery Reports payload for a date range: KPIs (with the previous equal-length period),
 * time series, and breakdowns for sales, stock, ratings, bulk requests and delivery partners.
 * Dates use the order's creation day. Aggregated in SQL and cached briefly per filter set.
 */
export async function getNurseryReport(prisma: PrismaClient, nurseryId: string, params: NurseryReportParams = {}) {
  const key = nurseryKey(
    nurseryId,
    'report',
    JSON.stringify([params.from?.toISOString() ?? null, params.to?.toISOString() ?? null, params.fulfillmentType ?? null, params.species ?? null]),
  );
  return cached(key, REPORT_TTL_MS, () => computeNurseryReport(prisma, nurseryId, params));
}

async function computeNurseryReport(prisma: PrismaClient, nurseryId: string, params: NurseryReportParams) {
  const nursery = await prisma.nurseryProfile.findUniqueOrThrow({ where: { id: nurseryId }, select: { createdAt: true } });
  const range = resolveReportRange(params.from, params.to, nursery.createdAt);
  const inRange = { gte: range.from, lte: range.to };

  const [kpis, previousKpis] = await Promise.all([
    computeKpis(prisma, nurseryId, range, params),
    range.previous ? computeKpis(prisma, nurseryId, range.previous, params) : Promise.resolve(null),
  ]);

  const fulfilmentCond = params.fulfillmentType ? Prisma.sql`AND o.fulfillment_type::text = ${params.fulfillmentType}` : Prisma.empty;
  const speciesCond = params.species
    ? Prisma.sql`AND EXISTS (SELECT 1 FROM order_items f WHERE f.order_id = o.id AND position(lower(${params.species}) in lower(f.species)) > 0)`
    : Prisma.empty;
  const completedList = [...COMPLETED];

  const [orders, reviewGroups, respondedCount, ledgerRows, bulk, stockRows, speciesRows, partnerRows] = await Promise.all([
    // Narrow rows only (no items) - enough for the time series and the status/fulfilment splits.
    prisma.order.findMany({
      where: orderWhere(nurseryId, range, params),
      select: { status: true, totalCents: true, createdAt: true, fulfillmentType: true },
    }),
    prisma.orderReview.groupBy({ by: ['nurseryRating'], where: { nurseryId, createdAt: inRange }, _count: { _all: true } }),
    prisma.orderReview.count({ where: { nurseryId, createdAt: inRange, nurseryResponse: { not: null } } }),
    prisma.$queryRaw<{ reason: string; pos: bigint | null; abs: bigint | null; net: bigint | null }[]>(
      Prisma.sql`SELECT reason::text AS reason,
          SUM(delta) FILTER (WHERE delta > 0) AS pos, SUM(ABS(delta)) AS abs, SUM(delta) AS net
        FROM sapling_stock_ledger
        WHERE nursery_id = ${nurseryId} AND created_at >= ${range.from} AND created_at <= ${range.to}
        GROUP BY reason`,
    ),
    prisma.bulkRequirementResponse.groupBy({ by: ['status'], where: { nurseryId, createdAt: inRange }, _count: { _all: true } }),
    prisma.$queryRaw<{ species: bigint; low: bigint; out: bigint }[]>(
      Prisma.sql`SELECT COUNT(*) AS species,
          COUNT(*) FILTER (WHERE quantity > 0 AND quantity <= low_stock_threshold) AS low,
          COUNT(*) FILTER (WHERE quantity <= 0) AS out
        FROM sapling_stock WHERE nursery_id = ${nurseryId} AND archived_at IS NULL`,
    ),
    prisma.$queryRaw<{ species: string; qty: bigint; rev: bigint }[]>(
      Prisma.sql`SELECT oi.species AS species, SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.unit_price_cents) AS rev
        FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE o.nursery_id = ${nurseryId} AND o.status::text = ANY(${completedList}::text[])
          AND o.created_at >= ${range.from} AND o.created_at <= ${range.to} ${fulfilmentCond} ${speciesCond}
        GROUP BY oi.species ORDER BY rev DESC LIMIT 8`,
    ),
    prisma.$queryRaw<{ partner_id: string; deliveries: bigint }[]>(
      Prisma.sql`SELECT dt.delivery_partner_id AS partner_id, COUNT(*) AS deliveries
        FROM orders o JOIN delivery_tracking dt ON dt.order_id = o.id
        WHERE o.nursery_id = ${nurseryId} AND o.status::text = ANY(${completedList}::text[])
          AND o.created_at >= ${range.from} AND o.created_at <= ${range.to} AND dt.delivery_partner_id IS NOT NULL
        GROUP BY dt.delivery_partner_id ORDER BY deliveries DESC LIMIT 5`,
    ),
  ]);

  const completed = orders.filter((o) => (COMPLETED as readonly string[]).includes(o.status));

  // ---- order splits ----
  const byStatus: Record<string, number> = {};
  const byFulfilment: Record<string, number> = { pickup: 0, delivery: 0 };
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    byFulfilment[o.fulfillmentType] = (byFulfilment[o.fulfillmentType] ?? 0) + 1;
  }

  // ---- stock movement ----
  const GIVEN_OUT = ['reservation_fulfilled', 'order_placed', 'bulk_requirement_fulfilled'];
  let added = 0;
  let restocked = 0;
  let givenOut = 0;
  for (const l of ledgerRows) {
    if (l.reason !== 'order_cancelled') added += Number(l.pos ?? 0);
    else restocked += Number(l.net ?? 0);
    if (GIVEN_OUT.includes(l.reason)) givenOut += Number(l.abs ?? 0);
  }
  const stockNow = stockRows[0];

  // ---- ratings ----
  const reviewTotal = reviewGroups.reduce((n, g) => n + g._count._all, 0);
  const distribution = [1, 2, 3, 4, 5].map((stars) => ({ stars, count: reviewGroups.find((g) => g.nurseryRating === stars)?._count._all ?? 0 }));

  // ---- delivery partners ----
  const partnerProfiles = partnerRows.length
    ? await prisma.deliveryPartnerProfile.findMany({
        where: { id: { in: partnerRows.map((r) => r.partner_id) } },
        select: { id: true, avgRating: true, user: { select: { name: true } } },
      })
    : [];
  const partnerById = new Map(partnerProfiles.map((p) => [p.id, p]));

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
      topSpecies: speciesRows.map((r) => ({ species: r.species, quantity: Number(r.qty), revenueCents: Number(r.rev) })),
      byStatus,
      byFulfilment,
    },
    stock: {
      added,
      givenOut,
      restocked,
      current: { species: Number(stockNow?.species ?? 0), low: Number(stockNow?.low ?? 0), out: Number(stockNow?.out ?? 0) },
    },
    ratings: {
      average: kpis.avgRating,
      total: reviewTotal,
      distribution,
      responseRate: pct(respondedCount, reviewTotal),
    },
    bulkRequirements: Object.fromEntries(bulk.map((g) => [g.status, g._count._all])),
    deliveryPartners: partnerRows
      .map((r) => {
        const p = partnerById.get(r.partner_id);
        return p ? { name: p.user.name, deliveries: Number(r.deliveries), avgRating: p.avgRating != null ? Number(p.avgRating) : null } : null;
      })
      .filter((p): p is { name: string; deliveries: number; avgRating: number | null } => p !== null),
  };
}
