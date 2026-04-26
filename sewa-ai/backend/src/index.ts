// SEWA AI Backend — src/index.ts
// Node.js 18+ | Express.js | TypeScript | Socket.IO
// README.pdf tech stack: Runtime Node.js 18+, Framework Express.js

import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/database';
import { redisClient } from './config/redis';
import { requestId } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { auditMiddleware } from './middleware/audit';
import { setupSocketIO } from './services/socketService';

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
import appointmentRoutes, { sendAppointmentReminders } from './routes/appointments/index';
import whatsappRoutes   from './routes/whatsapp';
import aiMonitoringRoutes from './routes/ai-monitoring';
import onboardingRoutes from './routes/onboarding';
import { escalateOverdueReferrals } from './services/roadmap/referralNetworkService';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
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
      imgSrc: ["'self'", 'data:', 'blob:', '*.sewaxai.health'],
    },
  },
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow if no origin (e.g. server-to-server or Postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = config.CORS_ORIGINS;
    const isAllowed = allowedOrigins.some(o => o === origin) || 
                     origin === 'https://sewaxai.health' ||
                     origin === 'http://sewaxai.health' ||
                     origin.endsWith('.sewaxai.health');

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(requestId);
app.use(rateLimiter);
app.use(auditMiddleware);

// ── Health ─────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const [dbOk, redisOk, triageOk] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(()=>true).catch(()=>false),
    redisClient.ping().then(r=>r==='PONG').catch(()=>false),
    axios.get(`${config.AI_SERVICE_URL}/health`, { timeout: 2000 }).then(r=>r.status===200).catch(()=>false)
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
import referralRoutes   from './routes/referrals';

// ...
app.use(`${v1}/referrals`,     referralRoutes);
app.use(`${v1}/whatsapp`,      whatsappRoutes);
app.use(`${v1}/audit`,          auditRoutes);
app.use(`${v1}/ai-monitoring`,  aiMonitoringRoutes);
app.use(`${v1}/onboarding`,     onboardingRoutes);
app.use(`${v1}`,               roadmapRoutes); // Roadmap features: /rules, /stroke-codes, /population-health, /referrals, /federated-learning, /continuous-learning

app.use(errorHandler);

// ── Startup ────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected');

    httpServer.listen(config.PORT, () => {
      logger.info(`SEWA AI Backend running on port ${config.PORT}`);
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
  } catch (err) {
    logger.error('Bootstrap error:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — graceful shutdown');
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

bootstrap();

export { io };
