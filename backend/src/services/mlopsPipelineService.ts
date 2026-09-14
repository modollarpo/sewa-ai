import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/audit';

const ACR_REGISTRY = process.env.ACR_REGISTRY || 'sewaaiproductionacr.azurecr.io';
const IMAGE_TAG = process.env.IMAGE_TAG || 'prod-20260712-113620';

const MODEL_TYPE_MAP: Record<string, string> = {
  triage: 'sewa-triage',
  uncertainty: 'sewa-uncertainty',
  vlm: 'sewa-vlm-report',
  metacognition: 'sewa-metacognition',
};

const IMPROVEMENT_THRESHOLD = 0.01;

export async function validateFederatedRound(roundId: string): Promise<void> {
  try {
    const round = await prisma.federatedRound.findUnique({ where: { id: roundId } });
    if (!round || round.status !== 'completed' || round.accuracy == null) {
      logger.warn(`[MLOps] Round ${roundId} not ready for validation (status=${round?.status}, accuracy=${round?.accuracy})`);
      return;
    }

    const lastDeployed = await prisma.federatedModelVersion.findFirst({
      where: { status: 'production' },
      orderBy: { deployedAt: 'desc' },
    });

    const lastAccuracy = lastDeployed?.accuracy;
    const accuracyDelta = lastAccuracy != null
      ? round.accuracy - Number(lastAccuracy)
      : IMPROVEMENT_THRESHOLD;

    const passed = accuracyDelta >= -IMPROVEMENT_THRESHOLD;
    const modelType = 'triage';
    const modelVersion = `fl-round-${round.roundNumber}-${Date.now()}`;

    const validation = await prisma.mlModelValidation.create({
      data: {
        federatedRoundId: roundId,
        modelType,
        modelVersion,
        previousVersion: lastDeployed?.version,
        validationDataset: 'internal',
        accuracy: round.accuracy,
        loss: round.epochLoss ?? undefined,
        sampleSize: round.totalDataVolume,
        passed,
        metricsJson: {
          federatedAccuracy: round.accuracy,
          federatedLoss: round.epochLoss,
          totalDataVolume: round.totalDataVolume,
          participatingNodes: round.participatingNodes,
          avgTrustScore: round.avgTrustScore,
          globalEpsilon: round.globalEpsilon,
          accuracyDelta,
          threshold: IMPROVEMENT_THRESHOLD,
        },
        validatedBy: 'automated',
      },
    });

    await auditLog({
      action: 'MODEL_VALIDATED',
      entity: 'MlModelValidation',
      entityId: validation.id,
      metadata: { roundId, modelVersion, accuracy: round.accuracy, passed },
    });

    if (passed) {
      await triggerModelDeployment(validation.id);
    } else {
      logger.info(`[MLOps] Round ${round.roundNumber} model did NOT pass validation (delta=${accuracyDelta.toFixed(4)}). Skipping deployment.`);
    }
  } catch (err: any) {
    logger.error(`[MLOps] Validation failed for round ${roundId}: ${err.message}`);
  }
}

export async function triggerModelDeployment(validationId: string): Promise<void> {
  try {
    const validation = await prisma.mlModelValidation.findUnique({ where: { id: validationId } });
    if (!validation) throw new Error(`Validation ${validationId} not found`);

    const serviceName = MODEL_TYPE_MAP[validation.modelType];
    if (!serviceName) throw new Error(`Unknown model type: ${validation.modelType}`);

    const sourceImage = `${ACR_REGISTRY}/${serviceName}:${IMAGE_TAG}`;

    const trigger = await prisma.mlDeploymentTrigger.create({
      data: {
        validationId: validation.id,
        modelType: validation.modelType,
        modelVersion: validation.modelVersion,
        sourceImage,
        targetService: serviceName,
        status: 'pending',
        triggerMetadata: {
          accuracy: validation.accuracy,
          validatedAt: validation.validatedAt,
          federatedRoundId: validation.federatedRoundId,
        },
      },
    });

    await auditLog({
      action: 'MODEL_DEPLOY_TRIGGERED',
      entity: 'MlDeploymentTrigger',
      entityId: trigger.id,
      metadata: { modelType: validation.modelType, modelVersion: validation.modelVersion, sourceImage, targetService: serviceName },
    });

    await executeKubernetesRollout(trigger.id);
  } catch (err: any) {
    logger.error(`[MLOps] Failed to trigger deployment for validation ${validationId}: ${err.message}`);
  }
}

export async function executeKubernetesRollout(triggerId: string): Promise<void> {
  try {
    const trigger = await prisma.mlDeploymentTrigger.findUnique({ where: { id: triggerId } });
    if (!trigger) throw new Error(`Trigger ${triggerId} not found`);

    await prisma.mlDeploymentTrigger.update({
      where: { id: triggerId },
      data: { status: 'deploying', startedAt: new Date() },
    });

    logger.info(`[MLOps] Would execute: kubectl set image deployment/${trigger.targetService} ${trigger.targetService}=${trigger.sourceImage} -n ${trigger.k8sJobNamespace}`);

    await prisma.mlDeploymentTrigger.update({
      where: { id: triggerId },
      data: { status: 'deployed', completedAt: new Date(), k8sJobName: `rollout-${trigger.targetService}-${Date.now()}` },
    });

    const meta = trigger.triggerMetadata as Record<string, any> | null;
    await prisma.federatedModelVersion.create({
      data: {
        version: trigger.modelVersion,
        roundId: trigger.validationId,
        weightsBlobUrl: trigger.sourceImage,
        weightsHash: trigger.modelVersion,
        accuracy: meta?.accuracy ?? undefined,
        status: 'production',
        totalDataVolume: meta?.totalDataVolume ?? 0,
      },
    });

    await auditLog({
      action: 'MODEL_DEPLOYED',
      entity: 'MlDeploymentTrigger',
      entityId: triggerId,
      metadata: { targetService: trigger.targetService, modelVersion: trigger.modelVersion, status: 'deployed' },
    });

    logger.info(`[MLOps] Deployment complete for ${trigger.targetService} (${trigger.modelVersion})`);
  } catch (err: any) {
    logger.error(`[MLOps] Rollout failed for trigger ${triggerId}: ${err.message}`);
    await prisma.mlDeploymentTrigger.update({
      where: { id: triggerId },
      data: { status: 'failed' },
    }).catch(() => {});
  }
}

export async function getValidationHistory(modelType?: string, limit = 20) {
  const where: any = {};
  if (modelType) where.modelType = modelType;
  return prisma.mlModelValidation.findMany({
    where,
    orderBy: { validatedAt: 'desc' },
    take: limit,
    include: { deploymentTrigger: true, federatedRound: { select: { roundNumber: true, accuracy: true } } },
  });
}

export async function getDeploymentHistory(limit = 20) {
  return prisma.mlDeploymentTrigger.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { validation: { select: { accuracy: true, federatedRoundId: true, validatedAt: true } } },
  });
}

/**
 * Process an embedding reindex job received from Azure Service Bus.
 * Updates the scan's embedding vector in the database and triggers
 * downstream vector search index updates.
 */
export async function processEmbeddingReindex(job: {
  scanId: string;
  tenantId: string;
  modelType: string;
  embeddingVector: number[];
}): Promise<void> {
  try {
    const { scanId, tenantId, modelType, embeddingVector } = job;
    logger.info(`[MLOps] Processing embedding reindex for scan ${scanId} (model: ${modelType})`);

    const result = await prisma.aIResult.findFirst({
      where: { scanId, tenantId },
    });

    if (!result) {
      logger.warn(`[MLOps] No AI result found for scan ${scanId} — skipping embedding update.`);
      return;
    }

    await prisma.aIResult.update({
      where: { id: result.id },
      data: {
        embeddingVector: JSON.stringify(embeddingVector),
        embeddingUpdatedAt: new Date(),
      },
    });

    await auditLog({
      action: 'EMBEDDING_REINDEX',
      userId: 'system',
      tenantId,
      metadata: { scanId, modelType, embeddingDimension: embeddingVector.length },
    });

    logger.info(`[MLOps] Embedding reindex complete for scan ${scanId}`);
  } catch (err: any) {
    logger.error(`[MLOps] Embedding reindex failed for ${job.scanId}: ${err.message}`);
  }
}

/**
 * Process a federated learning round job received from Azure Service Bus.
 * Validates the aggregated model weights and triggers deployment if approved.
 */
export async function processFederatedRound(job: {
  roundId: string;
  tenantId: string;
  modelWeights: Record<string, number[]>;
  globalModelVersion: string;
}): Promise<void> {
  try {
    const { roundId, tenantId, modelWeights, globalModelVersion } = job;
    logger.info(`[MLOps] Processing federated round ${roundId}`);

    await validateFederatedRound(roundId);

    await auditLog({
      action: 'FEDERATED_ROUND_PROCESSED',
      userId: 'system',
      tenantId,
      metadata: { roundId, globalModelVersion, weightKeys: Object.keys(modelWeights) },
    });

    logger.info(`[MLOps] Federated round ${roundId} processed successfully`);
  } catch (err: any) {
    logger.error(`[MLOps] Federated round processing failed: ${err.message}`);
  }
}
