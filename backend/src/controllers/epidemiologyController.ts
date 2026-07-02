import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';

export const getHeatmaps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Get aggregated event counts grouped by region and disease
    const data = await prisma.epidemiologyEvent.groupBy({
      by: ['region', 'disease'],
      _count: { id: true },
      where: { detectedAt: { gte: sinceDate } },
      orderBy: { _count: { id: 'desc' } }
    });

    res.json(data);
  } catch (err) { next(err); }
};

export const getAnomalies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real system, we'd calculate standard deviations over a 60-day trailing window.
    // For this prototype, we'll return hardcoded structured anomalies for regions that have high recent counts.
    const recentEvents = await prisma.epidemiologyEvent.groupBy({
      by: ['region', 'disease'],
      _count: { id: true },
      where: { detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // last 7 days
    });

    const anomalies = recentEvents
      .filter(e => e._count.id > 15) // arbitrary threshold for the prototype
      .map(e => ({
        region: e.region,
        disease: e.disease,
        baselineWeeklyExpected: Math.floor(e._count.id * 0.6), // mock baseline
        actualCount: e._count.id,
        percentageIncrease: Math.floor(((e._count.id - (e._count.id * 0.6)) / (e._count.id * 0.6)) * 100),
        status: e._count.id > 40 ? 'critical' : 'warning'
      }));

    res.json(anomalies);
  } catch (err) { next(err); }
};

export const getRecentEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await prisma.epidemiologyEvent.findMany({
      orderBy: { detectedAt: 'desc' },
      take: 50
    });
    res.json(events);
  } catch (err) { next(err); }
};
