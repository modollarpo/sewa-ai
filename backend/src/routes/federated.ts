import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

const router = Router();

// In-memory global weights store (initialized)
let globalModel = {
  version: 1,
  weights: {
    conv1: [0.15, -0.22, 0.45, 0.88, -0.09],
    dense1: [0.72, -0.11, 0.94, -0.34, 0.61]
  },
  totalSamples: 15000
};

// Queue of uploaded node updates
interface NodeUpdate {
  nodeId: string;
  weights: { conv1: number[]; dense1: number[] };
  samples: number;
}
let pendingUpdates: NodeUpdate[] = [];

/**
 * GET /api/v1/federated/model
 * Retrieve current global model config and weights.
 */
router.get('/model',
  authenticate, authorize('admin', 'superadmin', 'radiologist'),
  async (req: Request, res: Response) => {
    res.json(globalModel);
  }
);

/**
 * POST /api/v1/federated/upload
 * Nodes upload their local weights after an epoch of local training.
 */
router.post('/upload',
  authenticate, authorize('admin', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { nodeId, weights, samples } = req.body;
      if (!nodeId || !weights || !samples) {
        throw new AppError('nodeId, weights, and samples are required', 400);
      }

      // Check if update already exists for this node
      pendingUpdates = pendingUpdates.filter(u => u.nodeId !== nodeId);
      pendingUpdates.push({ nodeId, weights, samples });

      res.json({ message: 'Local model update queued successfully', pendingCount: pendingUpdates.length });
    } catch (err) { next(err); }
  }
);

/**
 * POST /api/v1/federated/aggregate
 * Trigger central FedAvg aggregation.
 */
router.post('/aggregate',
  authenticate, authorize('admin', 'superadmin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (pendingUpdates.length === 0) {
        throw new AppError('No pending node updates to aggregate', 400);
      }

      // Calculate total sample size N
      const N = pendingUpdates.reduce((acc, u) => acc + u.samples, 0);

      // Perform FedAvg: W_new = sum( (n_k / N) * W_k )
      const newConv1 = new Array(globalModel.weights.conv1.length).fill(0);
      const newDense1 = new Array(globalModel.weights.dense1.length).fill(0);

      for (const update of pendingUpdates) {
        const weightFactor = update.samples / N;
        for (let i = 0; i < update.weights.conv1.length; i++) {
          newConv1[i] += update.weights.conv1[i] * weightFactor;
        }
        for (let i = 0; i < update.weights.dense1.length; i++) {
          newDense1[i] += update.weights.dense1[i] * weightFactor;
        }
      }

      // Update global model
      globalModel = {
        version: globalModel.version + 1,
        weights: {
          conv1: newConv1.map(w => parseFloat(w.toFixed(6))),
          dense1: newDense1.map(w => parseFloat(w.toFixed(6)))
        },
        totalSamples: globalModel.totalSamples + N
      };

      const completedUpdates = [...pendingUpdates];
      pendingUpdates = []; // clear queue

      res.json({
        message: `Federated aggregation (FedAvg) complete. Model upgraded to version ${globalModel.version}.`,
        globalModel,
        aggregatedNodes: completedUpdates.map(u => ({ nodeId: u.nodeId, samples: u.samples }))
      });
    } catch (err) { next(err); }
  }
);

export default router;
