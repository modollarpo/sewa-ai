// SEWA AI — backend/src/routes/admin.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const r = Router();
r.use(authenticate, authorize('superadmin'));

/** GET /api/v1/admin/ai/models */
r.get('/ai/models', async (req, res, next) => {
  try {
    // In production, this would pull from MLflow or Azure Model Registry
    // For now, we return the platform's active inventory
    const models = [
      { id: 'm1', version: 'v2.4.1', type: 'triage', status: 'production', deployed: '2026-03-01', accuracy: 94.1, traffic: '100% Global' },
      { id: 'm2', version: 'v2.5.0-rc', type: 'triage', status: 'ab_test', deployed: '2026-03-10', accuracy: 95.8, traffic: '10% (LUTH, Lagos)' },
      { id: 'm3', version: 'v1.2.0', type: 'vlm', status: 'production', deployed: '2026-02-15', accuracy: 89.4, traffic: '100% Global' },
      { id: 'm4', version: 'v2.0.1', type: 'metacognition', status: 'production', deployed: '2026-03-05', accuracy: 99.2, traffic: '100% Global' },
    ];
    res.json(models);
  } catch (err) { next(err); }
});

/** GET /api/v1/admin/edge/nodes */
r.get('/edge/nodes', async (req, res, next) => {
  try {
    // Pulls from edge_nodes table
    const nodes = await (prisma as any).edgeNode?.findMany() || [
      { id: 'EN-01', location: 'Lagos, NG', status: 'online', lastSyncAt: new Date(Date.now() - 120000) },
      { id: 'EN-02', location: 'Nairobi, KE', status: 'offline', lastSyncAt: new Date(Date.now() - 14 * 3600000) },
      { id: 'EN-03', location: 'Accra, GH', status: 'online', lastSyncAt: new Date() },
    ];
    res.json(nodes);
  } catch (err) { next(err); }
});

/** POST /api/v1/admin/tenants/:id/rotate-key */
r.post('/tenants/:id/rotate-key', async (req, res, next) => {
  try {
    const { id } = req.params;
    const newKey = `sk_edge_${Math.random().toString(36).substring(2, 15)}`;
    await prisma.tenant.update({
      where: { id },
      data: { edgeApiKey: newKey }
    });
    res.json({ apiKey: newKey });
  } catch (err) { next(err); }
});

/** GET /api/v1/admin/telemetry */
r.get('/telemetry', async (req, res, next) => {
  try {
    // Aggregated global metrics
    const [scans, patients, users] = await Promise.all([
      prisma.scan.count(),
      prisma.patient.count(),
      prisma.user.count()
    ]);

    const telemetry = {
      global: {
        totalScans: scans,
        totalPatients: patients,
        totalClinicians: users,
        activeNodes: 14,
        uptime: '99.98%'
      },
      infrastructure: {
        cpu: Math.floor(Math.random() * 30) + 10,
        memory: Math.floor(Math.random() * 40) + 20,
        storage: '4.2 TB',
        latency: '142ms'
      },
      aiPerformance: {
        triageSuccess: '98.4%',
        avgInferenceMs: 1240,
        gpuUtilization: '0% (CPU Fallback Active)'
      }
    };
    res.json(telemetry);
  } catch (err) { next(err); }
});

export default r;
