import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../utils/prismaClient';
import { validateFederatedRound, triggerModelDeployment, getValidationHistory, getDeploymentHistory, executeKubernetesRollout } from '../services/mlopsPipelineService';

const r = Router();
r.use(authenticate, authorize('admin', 'superadmin'));

r.get('/validations', async (req, res, next) => {
  try {
    const { modelType, limit = '20' } = req.query as Record<string, string>;
    const validations = await getValidationHistory(modelType, parseInt(limit));
    res.json({ validations });
  } catch (err) { next(err); }
});

r.get('/deployments', async (req, res, next) => {
  try {
    const { limit = '20' } = req.query as Record<string, string>;
    const deployments = await getDeploymentHistory(parseInt(limit));
    res.json({ deployments });
  } catch (err) { next(err); }
});

r.post('/validate-round/:roundId', async (req, res, next) => {
  try {
    await validateFederatedRound(req.params.roundId);
    res.json({ message: 'Validation initiated', roundId: req.params.roundId });
  } catch (err) { next(err); }
});

r.post('/deploy/:validationId', async (req, res, next) => {
  try {
    await triggerModelDeployment(req.params.validationId);
    res.json({ message: 'Deployment triggered', validationId: req.params.validationId });
  } catch (err) { next(err); }
});

r.post('/rollout/:triggerId', async (req, res, next) => {
  try {
    await executeKubernetesRollout(req.params.triggerId);
    res.json({ message: 'K8s rollout executed', triggerId: req.params.triggerId });
  } catch (err) { next(err); }
});

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
