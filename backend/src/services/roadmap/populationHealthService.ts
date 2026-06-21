// SEWA AI — backend/src/services/roadmap/populationHealthService.ts
// Roadmap Feature 10: Population Health & Epidemiology Dashboard
// Aggregated anonymised disease surveillance across regions

import { prisma }   from '../../config/database';
import { redisClient } from '../../config/redis';
import { logger }   from '../../utils/logger';

// k-anonymity threshold — no cell < 10 patients revealed
const K_ANONYMITY = 10;
const CACHE_TTL   = 3600; // 1 hour

type RawSurveillanceRow = {
  bucket: Date;
  condition: string;
  region: string;
  count: number;
};

type RawPrevalenceRow = {
  country: string;
  count: number;
};

export type DiseaseTimeSeries = {
  date:      string;
  condition: string;
  region:    string;
  count:     number;
  rate:      number;       // per 1000 scans
  trend:     'rising' | 'stable' | 'falling';
};

export type OutbreakSignal = {
  condition:   string;
  region:      string;
  currentRate: number;
  baselineRate: number;
  zscore:      number;      // Standard deviations above baseline
  severity:    'watch' | 'warning' | 'alert';
  detectedAt:  string;
};

class PopulationHealthService {

  /** Aggregate disease counts by region — k-anonymised */
  async getDiseaseSurveillance(options: {
    startDate?: Date;
    endDate?:   Date;
    region?:    string;
    granularity: 'day' | 'week' | 'month';
  }): Promise<DiseaseTimeSeries[]> {

    const cacheKey = `pophealth:surveillance:${JSON.stringify(options)}`;
    const cached   = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const start = options.startDate ?? new Date(Date.now() - 90 * 86400_000);
    const end   = options.endDate   ?? new Date();

    // Raw aggregation — group by date bucket, finding, region
    const raw = await prisma.$queryRaw<any[]>`
      SELECT
        DATE_TRUNC(${options.granularity}, s."receivedAt") AS bucket,
        ai."primaryFinding"                                AS condition,
        t."region",
        COUNT(*)::int                                      AS count
      FROM "AIResult"     ai
      JOIN "Scan"         s  ON ai."scanId"    = s.id
      JOIN "Tenant"       t  ON s."tenantId"   = t.id
      WHERE s."receivedAt" BETWEEN ${start} AND ${end}
        ${options.region ? `AND t.region = ${options.region}` : ''}
      GROUP BY bucket, ai."primaryFinding", t.region
      HAVING COUNT(*) >= ${K_ANONYMITY}
      ORDER BY bucket, condition
    `;

    // Calculate rolling totals for rates
    const totalByBucket: Record<string, number> = {};
    for (const row of raw as RawSurveillanceRow[]) {
      const key = `${row.bucket.toISOString()}:${row.region}`;
      totalByBucket[key] = (totalByBucket[key] ?? 0) + row.count;
    }

    // Compute trends (compare last vs previous period)
    const series: DiseaseTimeSeries[] = (raw as RawSurveillanceRow[]).map(row => {
      const total = totalByBucket[`${row.bucket.toISOString()}:${row.region}`] || 1;
      return {
        date:      new Date(row.bucket).toISOString().split('T')[0],
        condition: row.condition,
        region:    row.region,
        count:     row.count,
        rate:      parseFloat((row.count / total * 1000).toFixed(2)),
        trend:     'stable',  // computed below
      };
    });

    // Trend computation: compare each period to previous
    const byConditionRegion = this.groupBy(series, (r: DiseaseTimeSeries) => `${r.condition}:${r.region}`);
    for (const [, points] of Object.entries(byConditionRegion)) {
      const sorted = (points as DiseaseTimeSeries[]).sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < sorted.length; i++) {
        const delta = sorted[i].rate - sorted[i-1].rate;
        sorted[i].trend = delta > 5 ? 'rising' : delta < -5 ? 'falling' : 'stable';
      }
    }

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(series));
    return series;
  }

  /** Outbreak detection — Z-score anomaly detection */
  async detectOutbreaks(region?: string): Promise<OutbreakSignal[]> {
    const cacheKey = `pophealth:outbreaks:${region ?? 'all'}`;
    const cached   = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Get last 8 weeks of daily data
    const series = await this.getDiseaseSurveillance({
      startDate:   new Date(Date.now() - 56 * 86400_000),
      granularity: 'day',
      region,
    });

    const signals: OutbreakSignal[] = [];
    const byConditionRegion = this.groupBy(series, (r: DiseaseTimeSeries) => `${r.condition}:${r.region}`);

    for (const [key, points] of Object.entries(byConditionRegion)) {
      const sorted = (points as DiseaseTimeSeries[]).sort((a, b) => a.date.localeCompare(b.date));
      if (sorted.length < 14) continue;

      const recent   = sorted.slice(-7);   // Last week
      const baseline = sorted.slice(0, -7); // Prior 7+ weeks

      const baselineRates = baseline.map(p => p.rate);
      const mean    = baselineRates.reduce((a, b) => a + b, 0) / baselineRates.length;
      const std     = Math.sqrt(baselineRates.reduce((a, b) => a + (b - mean) ** 2, 0) / baselineRates.length);

      const currentRate = recent.reduce((a, p) => a + p.rate, 0) / recent.length;
      const zscore      = std > 0 ? (currentRate - mean) / std : 0;

      if (zscore > 2.0) {
        const [condition, reg] = key.split(':');
        signals.push({
          condition,
          region:       reg,
          currentRate:  parseFloat(currentRate.toFixed(2)),
          baselineRate: parseFloat(mean.toFixed(2)),
          zscore:       parseFloat(zscore.toFixed(2)),
          severity:     zscore > 3.5 ? 'alert' : zscore > 2.5 ? 'warning' : 'watch',
          detectedAt:   new Date().toISOString(),
        });
      }
    }

    signals.sort((a, b) => b.zscore - a.zscore);
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(signals));
    return signals;
  }

  /** Condition prevalence heat map by country */
  async getPrevalenceMap(condition: string, startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    const start = startDate ?? new Date(Date.now() - 30 * 86400_000);
    const end   = endDate   ?? new Date();

    const rows = await prisma.$queryRaw<RawPrevalenceRow[]>`
      SELECT t.country, COUNT(*)::int AS count
      FROM "AIResult"   ai
      JOIN "Scan"       s ON ai."scanId"   = s.id
      JOIN "Tenant"     t ON s."tenantId"  = t.id
      WHERE ai."primaryFinding" ILIKE ${`%${condition}%`}
        AND s."receivedAt" BETWEEN ${start} AND ${end}
      GROUP BY t.country
      HAVING COUNT(*) >= ${K_ANONYMITY}
    `;

    return Object.fromEntries(rows.map((r: RawPrevalenceRow) => [r.country, r.count]));
  }

  /** Global summary stats for super-admin */
  async getGlobalSummary(): Promise<Record<string, unknown>> {
    const cacheKey = 'pophealth:global:summary';
    const cached   = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [totalScans, criticalFindings, tenantCount, topFindings] = await Promise.all([
      prisma.scan.count(),
      prisma.aIResult.count({ where: { urgency: 'CRITICAL' } }),
      prisma.tenant.count({ where: { status: 'active' } }),
      prisma.aIResult.groupBy({
        by: ['primaryFinding'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const result = {
      totalScans, criticalFindings, tenantCount,
      topFindings: topFindings.map((f: { primaryFinding: string; _count: { id: number } }) => ({ condition: f.primaryFinding, count: f._count.id })),
      computedAt:  new Date().toISOString(),
    };

    await redisClient.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  }

  private groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
    return arr.reduce((acc, item) => {
      const k = key(item);
      acc[k]  = acc[k] ?? [];
      acc[k].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }
}

export const populationHealthService = new PopulationHealthService();
