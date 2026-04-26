// SEWA AI — backend/src/services/longitudinalService.ts
// Longitudinal progression analysis — finding prior scans and preparing for registration
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface PriorScanInfo {
  id: string;
  receivedAt: Date;
  finding: string;
  urgency: string;
  vlmImpression: string | null;
}

/**
 * Finds the most relevant prior scan for comparison.
 * Modality and BodyPart must match for valid longitudinal analysis.
 */
export async function findPriorScan(patientId: string, currentScanId: string, modality: string, bodyPart: string): Promise<PriorScanInfo | null> {
  try {
    const prior = await prisma.scan.findFirst({
      where: {
        patientId,
        id: { not: currentScanId },
        modality,
        bodyPart,
        status: 'COMPLETED',
        aiResult: { isNot: null }
      },
      orderBy: { receivedAt: 'desc' },
      include: { aiResult: true }
    });

    if (!prior) return null;

    return {
      id: prior.id,
      receivedAt: prior.receivedAt,
      finding: prior.aiResult?.primaryFinding || 'Normal',
      urgency: prior.aiResult?.urgency || 'NORMAL',
      vlmImpression: prior.aiResult?.vlmImpression || null,
    };
  } catch (err: any) {
    logger.error(`[Longitudinal] Prior search failed: ${err.message}`);
    return null;
  }
}

/**
 * Generates a comparison summary for the VLM engine.
 */
export function formatLongitudinalPrompt(prior: PriorScanInfo | null): string {
  if (!prior) return "No prior scans available for longitudinal comparison.";
  
  return `[PRIOR SCAN]: ${prior.receivedAt.toISOString()} | [FINDING]: ${prior.finding} | [IMPRESSION]: ${prior.vlmImpression || 'None'}`;
}
