import { apiFetch } from './client';

export interface ReportSeriesPoint {
  /** ISO timestamp of the bucket's first day. */
  start: string;
  count: number;
  value: number;
}

export type ReportGranularity = 'day' | 'week' | 'month';

interface ReportRangeInfo {
  from: string;
  to: string;
  granularity: ReportGranularity;
  allTime: boolean;
}

export interface ReportDateParams {
  from?: string;
  to?: string;
}

// ------------------------------------------------------------------ NGO

export interface NgoReportKpis {
  raisedCents: number;
  donationCount: number;
  donors: number;
  avgDonationCents: number;
  rsvps: number;
  attendanceRate: number | null;
  volunteerHours: number;
  newVolunteers: number;
  returningVolunteers: number;
  drivesHeld: number;
  treesPlanted: number;
  adoptions: number;
  followersGained: number;
  posts: number;
  sponsoredCents: number;
}

export interface ApiNgoRangeReport {
  range: ReportRangeInfo;
  filters: { driveId: string | null; campaignId: string | null };
  kpis: NgoReportKpis;
  /** Same figures for the equal-length window just before; null for All time. */
  previousKpis: NgoReportKpis | null;
  series: {
    donations: ReportSeriesPoint[];
    rsvps: ReportSeriesPoint[];
    trees: ReportSeriesPoint[];
    adoptions: ReportSeriesPoint[];
    followers: ReportSeriesPoint[];
  };
  followersTotal: number;
  fundraising: {
    byCampaign: { id: string; title: string; raisedCents: number; donations: number; goalCents: number | null }[];
    statusSplit: Record<string, number>;
    byCategory: { category: string; cents: number }[];
  };
  drives: {
    rows: {
      id: string;
      title: string;
      startsAt: string;
      status: 'upcoming' | 'cancelled' | 'completed';
      city: string | null;
      capacity: number | null;
      rsvps: number;
      attendanceRate: number | null;
      hours: number;
      treesPlanted: number;
    }[];
    topVolunteers: { name: string; handle: string; hours: number }[];
  };
  trees: {
    total: number;
    survival: Record<'healthy' | 'struggling' | 'dead' | 'removed' | 'not_checked', number>;
    survivalRate: number | null;
    bySpecies: { species: string; planted: number; alive: number }[];
    byZone: { zone: string; count: number }[];
  };
  bulkRequirements: Record<string, number>;
}

export interface NgoReportFilters extends ReportDateParams {
  driveId?: string;
  campaignId?: string;
}

export async function fetchNgoRangeReport(f: NgoReportFilters): Promise<ApiNgoRangeReport> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
  return apiFetch<ApiNgoRangeReport>(`/api/ngo/reports/range?${q.toString()}`);
}

// ------------------------------------------------------------------ Nursery

export interface NurseryReportKpis {
  orders: number;
  revenueCents: number;
  avgOrderValueCents: number;
  saplingsSold: number;
  fulfilmentRate: number | null;
  cancellationRate: number | null;
  cancellationFeesCents: number;
  avgRating: number | null;
  reviews: number;
  newCustomers: number;
  returningCustomers: number;
}

export interface ApiNurseryReport {
  range: ReportRangeInfo;
  filters: { fulfillmentType: 'pickup' | 'delivery' | null; species: string | null };
  kpis: NurseryReportKpis;
  previousKpis: NurseryReportKpis | null;
  series: { revenue: ReportSeriesPoint[]; orders: ReportSeriesPoint[] };
  sales: {
    topSpecies: { species: string; quantity: number; revenueCents: number }[];
    byStatus: Record<string, number>;
    byFulfilment: Record<string, number>;
  };
  stock: { added: number; givenOut: number; restocked: number; current: { species: number; low: number; out: number } };
  ratings: { average: number | null; total: number; distribution: { stars: number; count: number }[]; responseRate: number | null };
  bulkRequirements: Record<string, number>;
  deliveryPartners: { name: string; deliveries: number; avgRating: number | null }[];
}

export interface NurseryReportFilters extends ReportDateParams {
  fulfillmentType?: 'pickup' | 'delivery';
  species?: string;
}

export async function fetchNurseryReport(f: NurseryReportFilters): Promise<ApiNurseryReport> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
  return apiFetch<ApiNurseryReport>(`/api/nursery/reports?${q.toString()}`);
}
