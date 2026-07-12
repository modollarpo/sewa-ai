// SEWA XAI Backend — src/index.ts
// Node.js 18+ | Express.js | TypeScript | Socket.IO
// README.pdf tech stack: Runtime Node.js 18+, Framework Express.js

// Initialize telemetry FIRST before importing anything else!
import './telemetry';

import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/database';
import { redisClient } from './config/redis';
import { requestId } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { auditMiddleware } from './middleware/audit';
import { setupSocketIO } from './services/socketService';
import { authenticate, authorize } from './middleware/auth';
import { scanQueue, startScanWorker } from './services/scanQueue';
import { startScanQueueBridge } from './services/scanQueueBridge';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

// Swagger/OpenAPI configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SEWA XAI API',
      version: '2.4.1',
      description: 'Enterprise-grade clinical diagnostic AI platform API',
    },
    servers: [
      {
        url: config.APP_URL || 'http://localhost:3000',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Routes
import authRoutes       from './routes/auth';
import scanRoutes       from './routes/scans';
import reportRoutes     from './routes/reports';
import patientRoutes    from './routes/patients';
import aiRoutes         from './routes/ai';
import paymentRoutes    from './routes/payments';
import tenantRoutes     from './routes/tenants';
import userRoutes       from './routes/users';
import fhirRoutes       from './routes/fhir';
import notificationRoutes from './routes/notifications';
import analyticsRoutes  from './routes/analytics';
import adminRoutes      from './routes/admin';
import templateRoutes   from './routes/templates';
import annotationRoutes from './routes/annotations';
import secondOpinionRoutes from './routes/secondOpinions';
import auditRoutes      from './routes/audit';
import roadmapRoutes    from './routes/roadmap/index';
import appointmentRoutes from './routes/appointments/index';
import whatsappRoutes   from './routes/whatsapp';
import aiMonitoringRoutes from './routes/ai-monitoring';
import onboardingRoutes from './routes/onboarding';
import complianceRoutes from './routes/compliance';
import trainingRoutes   from './routes/training';
import referralRoutes   from './routes/referrals';
import supportRoutes    from './routes/support';
import feedbackRoutes   from './routes/feedback';
import learningLoopRoutes from './routes/learningLoop';
import federatedRoutes from './routes/federated';
import edgeSyncRoutes from './routes/edgeSync';
import clinicalFusionRoutes from './routes/clinicalFusion';
import zkConsentRoutes from './routes/zkConsent';
import populationHealthRoutes from './routes/populationHealth';
import naturalLanguageQueryRoutes from './routes/naturalLanguageQuery';
import longitudinalRoutes from './routes/longitudinal';
import pipelineRoutes     from './routes/pipeline';
import versionRoutes     from './routes/versions';
import mlopsRoutes       from './routes/mlops';
import v2Router           from './routes/v2Router';
import { apiVersioning } from './middleware/apiVersioning';
import { startMetricFlush, stopMetricFlush } from './services/observabilityService';
import { sendAppointmentReminders } from './routes/appointments/index';
import { escalateOverdueReferrals } from './services/roadmap/referralNetworkService';
import { dlq } from './services/dlqService';
import { processDunning } from './services/dunningService';

// Set up Bull Board for queue monitoring
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(scanQueue)],
  serverAdapter,
});

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

// ── Socket.IO — Feature 6 (Real-time Notifications) ───────────
const io = new SocketServer(httpServer, {
  cors: { 
    origin: (origin, callback) => {
      if (!origin || config.CORS_ORIGINS.includes(origin) || /\.sewaxai\.health$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }, 
    credentials: true 
  },
  transports: ['websocket', 'polling'],
});
setupSocketIO(io);

// ── Security & Middleware ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', '*.sewaxai.health', 'https:'],
      connectSrc: ["'self'", '*.sewaxai.health'],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny', // Explicitly deny framing (clickjacking protection)
  },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow if no origin in development only (server-to-server, Postman)
    // Also allow no-origin for health probes (Kubernetes liveness/readiness)
    if (!origin) {
      if (config.NODE_ENV !== 'production') return callback(null, true);
      return callback(null, true);
    }

    const allowedOrigins = config.CORS_ORIGINS;
    const isAllowed = allowedOrigins.some(o => o === origin) || 
                     origin === 'https://sewaxai.health' ||
                     (origin.startsWith('https://') && origin.endsWith('.sewaxai.health'));

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Region'],
}));

app.use(compression() as any);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(requestId);
app.use(rateLimiter);
app.use(auditMiddleware);

// ── Bull Board Queue UI (Admin Only) ──────────────────────────
app.use('/admin/queues', authenticate, authorize('admin', 'superadmin'), serverAdapter.getRouter());

// ── API Documentation (Swagger/OpenAPI) ───────────────────────
// Only expose in development to prevent API surface reconnaissance
if (config.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}

// ── Health ─────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const timeoutPromise = new Promise<false>((resolve) => setTimeout(() => resolve(false), 4000));
  const safeCheck = (p: Promise<any>) => Promise.race([p, timeoutPromise]);

  // Redis check: use status first, only call ping() if already 'ready'.
  // The shared singleton has maxRetriesPerRequest:null which queues commands
  // indefinitely during reconnection — a plain ping() would block until timeout.
  const redisCheck = async (): Promise<boolean> => {
    const status = redisClient.status;
    if (status !== 'ready') {
      logger.warn(`[Health] Redis status: ${status} (not ready)`);
      return false;
    }
    try {
      const r = await redisClient.ping() as string;
      logger.debug(`[Health] Redis ping: ${JSON.stringify(r)}`);
      return !!(r && (r.toUpperCase() === 'PONG' || r === '+PONG'));
    } catch (e: any) {
      logger.error(`[Health] Redis ping error: ${e.message}`);
      return false;
    }
  };

  const [dbOk, redisOk, triageOk] = await Promise.all([
    safeCheck(prisma.$queryRaw`SELECT 1`.then(()=>true).catch(()=>false)),
    safeCheck(redisCheck()),
    safeCheck(axios.get(`${config.AI_SERVICE_URL}/health`, { timeout: 2000 }).then((r: any) => r.status === 200).catch(() => false))
  ]);

  res.json({
    status: dbOk && redisOk && triageOk ? 'healthy' : 'degraded',
    version: '2.4.1',
    timestamp: new Date().toISOString(),
    services: { 
      database: dbOk, 
      redis: redisOk, 
      triage_ai: triageOk,
      socket: io.engine.clientsCount 
    },
  });
});

// ── API Routes ─────────────────────────────────────────────────
const v1 = '/api/v1';
app.use(`${v1}/auth`,           authRoutes);
app.use(`${v1}/scans`,          scanRoutes);
app.use(`${v1}/reports`,        reportRoutes);
app.use(`${v1}/patients`,       patientRoutes);
app.use(`${v1}/ai`,             aiRoutes);
app.use(`${v1}/payments`,       paymentRoutes);
app.use(`${v1}/tenants`,        tenantRoutes);
app.use(`${v1}/users`,          userRoutes);
app.use(`${v1}/fhir`,           fhirRoutes);
app.use(`${v1}/notifications`,  notificationRoutes);
app.use(`${v1}/analytics`,      analyticsRoutes);
app.use(`${v1}/admin`,          adminRoutes);
app.use(`${v1}/templates`,      templateRoutes);
app.use(`${v1}/annotations`,    annotationRoutes);
app.use(`${v1}/second-opinions`,secondOpinionRoutes);
app.use(`${v1}/onboarding`,     onboardingRoutes);
app.use(`${v1}/compliance`,     complianceRoutes);
app.use(`${v1}/training`,       trainingRoutes);
app.use(`${v1}/referrals`,      referralRoutes);
app.use(`${v1}/whatsapp`,       whatsappRoutes);
app.use(`${v1}/audit`,          auditRoutes);
app.use(`${v1}/ai-monitoring`,  aiMonitoringRoutes);
app.use(`${v1}/appointments`,   appointmentRoutes);
app.use(`${v1}/support`,        supportRoutes);
app.use(`${v1}/feedback`,       feedbackRoutes);
app.use(`${v1}/learning-loop`,  learningLoopRoutes);
app.use(`${v1}/federated`,      federatedRoutes);
app.use(`${v1}/edge-sync`,      edgeSyncRoutes);
app.use(`${v1}/clinical-fusion`,clinicalFusionRoutes);
app.use(`${v1}/zk-consent`,     zkConsentRoutes);
app.use(`${v1}/population-health`,populationHealthRoutes);
app.use(`${v1}/nlq`,            naturalLanguageQueryRoutes);
app.use(`${v1}/longitudinal`,   longitudinalRoutes);
app.use(`${v1}/pipeline`,       pipelineRoutes);
app.use(`${v1}`,                roadmapRoutes);
app.use(`${v1}/versions`,       versionRoutes);
app.use(`${v1}/mlops`,          mlopsRoutes);

// ── API v2 Routes ─────────────────────────────────────────────────
app.use(apiVersioning);
app.use('/api/v2',               v2Router);

app.use(errorHandler);

// ── Startup ────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected');

    httpServer.listen(config.PORT, () => {
      logger.info(`SEWA XAI Backend running on port ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`Region: ${config.REGION}`);
    });

    // ── Appointment reminder cron — every hour ─────────────────
    setInterval(async () => {
      try { await sendAppointmentReminders(); }
      catch (e: any) { logger.error('[Cron] Appointment reminder failed:', e.message); }
    }, 60 * 60 * 1000);
    logger.info('[Cron] Appointment reminder scheduler started (hourly)');

    // ── Referral SLA escalation cron — every 30 minutes ───────
    setInterval(async () => {
      try { await escalateOverdueReferrals(); }
      catch (e: any) { logger.error('[Cron] Referral SLA escalation failed:', e.message); }
    }, 30 * 60 * 1000);
    logger.info('[Cron] Referral SLA escalation scheduler started (every 30 min)');

    // ── Scan processing cleanup cron — every 5 minutes ─────────
    setInterval(async () => {
      try {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const stuck = await prisma.scan.updateMany({
          where: { status: 'processing', receivedAt: { lt: tenMinsAgo } },
          data: { status: 'failed', errorMessage: 'Processing timeout (10m)' },
        });
        if (stuck.count > 0) logger.warn(`[Cron] Cleaned up ${stuck.count} stuck scans.`);
      } catch (e: any) { logger.error('[Cron] Scan cleanup failed:', e.message); }
    }, 5 * 60 * 1000);
    logger.info('[Cron] Scan processing cleanup scheduler started (every 5 min)');

    // ── DLQ processor cron — every 5 minutes (BG1/BG2) ──────────
    setInterval(async () => {
      try {
        const depth = await dlq.depth();
        if (depth > 0) {
          logger.info(`[DLQ] Processing ${depth} queued scans`);
          await dlq.process();
        }
      } catch (e: any) { logger.error('[DLQ] Cron error:', e.message); }
    }, 5 * 60 * 1000);
    logger.info('[Cron] DLQ processor started (every 5 min)');

    // ── Dunning process cron — every hour ───────────────────────
    setInterval(async () => {
      try {
        await processDunning();
      } catch (e: any) { logger.error('[Cron] Dunning process failed:', e.message); }
    }, 60 * 60 * 1000);
    logger.info('[Cron] Dunning process started (hourly)');

    // Start metric flush for observability
    startMetricFlush();
    logger.info('[Observability] Metric flush worker started (every 30s)');

    // Merkle block sealer — every 5 minutes
    setInterval(async () => {
      try {
        const { sealAuditBlock } = await import('./services/merkleBlockService');
        const hash = await sealAuditBlock();
        if (hash) logger.debug(`[Cron] Auto-sealed audit block`);
      } catch (e: any) {
        logger.error('[Cron] Merkle block seal failed:', e.message);
      }
    }, 5 * 60 * 1000);
    logger.info('[Cron] Merkle block sealer started (every 5 min)');

    // Start scan AI pipeline worker
    const workerConcurrency = parseInt(process.env.SCAN_WORKER_CONCURRENCY || '10', 10);
    startScanWorker(workerConcurrency);

    // Start queue bridge (Go Redis List → BullMQ)
    startScanQueueBridge().catch(err => {
      logger.error('Scan queue bridge failed to start', err);
      process.exit(1);
    });
  } catch (err) {
    logger.error('Bootstrap error:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — graceful shutdown');
  stopMetricFlush();
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export default app;
export { io };
