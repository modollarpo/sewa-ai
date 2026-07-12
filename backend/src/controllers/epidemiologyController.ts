import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import axios from 'axios';

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
    const recentEvents = await prisma.epidemiologyEvent.groupBy({
      by: ['region', 'disease'],
      _count: { id: true },
      where: { detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    });

    if (!config.AZURE_OPENAI_API_KEY || !config.AZURE_OPENAI_ENDPOINT) {
      logger.warn('[EPI] No Azure OpenAI credentials, returning threshold-based anomalies.');
      const anomalies = recentEvents
        .filter(e => e._count.id > 15)
        .map(e => ({
          region: e.region,
          disease: e.disease,
          baselineWeeklyExpected: Math.floor(e._count.id * 0.6),
          actualCount: e._count.id,
          percentageIncrease: Math.floor(((e._count.id - (e._count.id * 0.6)) / (e._count.id * 0.6)) * 100),
          status: e._count.id > 40 ? 'critical' : 'warning'
        }));
      return res.json(anomalies);
    }

    const endpoint = config.AZURE_OPENAI_ENDPOINT.endsWith('/') ? config.AZURE_OPENAI_ENDPOINT : `${config.AZURE_OPENAI_ENDPOINT}/`;
    const gptDeployment = config.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-54-mini';
    const gptUrl = `${endpoint}openai/deployments/${gptDeployment}/chat/completions?api-version=2025-01-01-preview`;
    
    let anomalies = [];
    try {
      const gptRes = await axios.post(gptUrl, {
        messages: [
          { role: 'system', content: 'You are an AI Epidemiologist. Analyze the following disease case counts over the last 7 days. Return ONLY a JSON array of anomaly objects formatted strictly as: [{"region":"string", "disease":"string", "baselineWeeklyExpected":number, "actualCount":number, "percentageIncrease":number, "status":"warning"|"critical"}]. Only include regions with significant outbreaks (anomalies). Do not output markdown code blocks, just raw JSON.' },
          { role: 'user', content: JSON.stringify(recentEvents) }
        ],
        temperature: 0.2
      }, {
        headers: { 'api-key': config.AZURE_OPENAI_API_KEY },
        timeout: 15000
      });
      
      const usage = gptRes.data?.usage;
      if (usage) logger.info(`[EPI] GPT tokens — prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens}, total: ${usage.total_tokens}`);

      const content = gptRes.data.choices[0].message.content;
      const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      anomalies = JSON.parse(jsonStr);
    } catch (err: any) {
      logger.error(`[EPI] Azure OpenAI GPT anomaly detection failed: ${err.message}, falling back to threshold heuristic.`);
      anomalies = recentEvents
        .filter(e => e._count.id > 15)
        .map(e => ({
          region: e.region,
          disease: e.disease,
          baselineWeeklyExpected: Math.floor(e._count.id * 0.6),
          actualCount: e._count.id,
          percentageIncrease: Math.floor(((e._count.id - (e._count.id * 0.6)) / (e._count.id * 0.6)) * 100),
          status: e._count.id > 40 ? 'critical' : 'warning'
        }));
    }

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
