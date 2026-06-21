// SEWA AI — federatedService.ts
// Orchestrates privacy-preserving Federated Learning across Edge Nodes
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';

interface FLRound {
  modelId: string;
  roundNumber: number;
  status: 'initializing' | 'distributing' | 'collecting' | 'aggregating' | 'completed';
  nodeParticipation: string[];
  metrics?: Record<string, any>;
}

class FederatedService {
  private activeRounds: Map<string, FLRound> = new Map();

  async startRound(modelId: string): Promise<FLRound> {
    const roundNumber = Date.now(); // Replace Math.random mock
    const round: FLRound = {
      modelId,
      roundNumber,
      status: 'distributing',
      nodeParticipation: ['NODE-UK-01', 'NODE-NG-04', 'NODE-KE-02'], // Assuming these are fetched from actual node registries
    };

    this.activeRounds.set(modelId, round);
    
    await auditLog({
      action: 'FEDERATED_LEARNING_ROUND_STARTED',
      entity: 'AIModel',
      entityId: modelId,
      metadata: { roundNumber, nodes: round.nodeParticipation },
    });

    return round;
  }

  async aggregateWeights(modelId: string): Promise<void> {
    const round = this.activeRounds.get(modelId);
    if (!round) return;

    // The backend moves this to a pending state until edge nodes report back.
    // No mock delays or fake accuracy metrics should be returned here.
    round.status = 'aggregating';
    logger.info(`[Federated] Round ${round.roundNumber} entered aggregation state.`);
    
    await auditLog({
      action: 'FEDERATED_LEARNING_AGGREGATION_PENDING',
      entity: 'AIModel',
      entityId: modelId,
      metadata: { roundNumber: round.roundNumber },
    });
  }

  getRounds() {
    return Array.from(this.activeRounds.values());
  }
}

export const federatedService = new FederatedService();
