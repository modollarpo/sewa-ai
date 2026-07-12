// SEWA XAI — backend/src/routes/mlops.ts
// MLOps pipeline: federated learning validation → model deployment
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { validateFederatedRound, triggerModelDeployment, getValidationHistory, getDeploymentHistory, executeKubernetesRollout } from '../services/mlopsPipelineService';

const r = Router();
r.use(authenticate, authorize('admin', 'superadmin'));

/**
 * GET /api/v1/mlops/validations
 * @summary List model validation history
 * @tags MLOps
 * @param {string} modelType.query - Filter by model type (triage|uncertainty|vlm|metacognition)
 * @param {number} limit.query - Max results (default 20)
 * @return {object} 200 - { validations: MlModelValidation[] }
 */
r.get('/validations', async (req, res, next) => {
  try {
    const { modelType, limit = '20' } = req.query as Record<string, string>;
    const validations = await getValidationHistory(modelType, parseInt(limit));
    res.json({ validations });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/mlops/deployments
 * @summary List model deployment history
 * @tags MLOps
 * @param {number} limit.query - Max results (default 20)
 * @return {object} 200 - { deployments: MlDeploymentTrigger[] }
 */
r.get('/deployments', async (req, res, next) => {
  try {
    const { limit = '20' } = req.query as Record<string, string>;
    const deployments = await getDeploymentHistory(parseInt(limit));
    res.json({ deployments });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/mlops/validate-round/{roundId}
 * @summary Trigger validation for a completed federated round
 * @tags MLOps
 * @param {string} roundId.path - Federated round ID
 * @return {object} 200 - { message: string, roundId: string }
 */
r.post('/validate-round/:roundId', async (req, res, next) => {
  try {
    await validateFederatedRound(req.params.roundId);
    res.json({ message: 'Validation initiated', roundId: req.params.roundId });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/mlops/deploy/{validationId}
 * @summary Trigger k8s deployment from a successful validation
 * @tags MLOps
 * @param {string} validationId.path - MlModelValidation ID
 * @return {object} 200 - { message: string, validationId: string }
 */
r.post('/deploy/:validationId', async (req, res, next) => {
  try {
    await triggerModelDeployment(req.params.validationId);
    res.json({ message: 'Deployment triggered', validationId: req.params.validationId });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/mlops/rollout/{triggerId}
 * @summary Execute k8s rollout for a deployment trigger
 * @tags MLOps
 * @param {string} triggerId.path - MlDeploymentTrigger ID
 * @return {object} 200 - { message: string, triggerId: string }
 */
r.post('/rollout/:triggerId', async (req, res, next) => {
  try {
    await executeKubernetesRollout(req.params.triggerId);
    res.json({ message: 'K8s rollout executed', triggerId: req.params.triggerId });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/mlops/rounds/{roundId}/complete
 * @summary Complete a federated round and trigger auto-validation
 * @tags MLOps
 * @param {string} roundId.path - Federated round ID
 * @param {object} request.body - { accuracy, epochLoss, totalDataVolume, participatingNodes }
 * @return {object} 200 - { round: FederatedRound, message: string }
 */
r.post('/rounds/:roundId/complete', async (req, res, next) => {
  try {
    const { roundId } = req.params;
    const { accuracy, epochLoss, totalDataVolume, participatingNodes } = req.body;

    const round = await prisma.federatedRound.update({
      where: { id: roundId },
      data: { status: 'completed', accuracy, epochLoss, totalDataVolume, participatingNodes, aggregatedAt: new Date() },
    });

    await validateFederatedRound(roundId);
    res.json({ round, message: 'Round completed and validation triggered' });
  } catch (err) { next(err); }
});

export default r;
