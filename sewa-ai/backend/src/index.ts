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
import { escalateOverdueReferrals } from './services/roadmap/referralNetworkService';

const app = express();
const httpServer = createServer(app);

// ── Socket.IO — Feature 6 (Real-time Notifications) ───────────
const io = new SocketServer(httpServer, {
  cors: { origin: config.CORS_ORIGINS, credentials: true },
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
  origin: config.CORS_ORIGINS,
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
  const dbOk = await prisma.$queryRaw`SELECT 1`.then(()=>true).catch(()=>false);
  const redisOk = await redisClient.ping().then(r=>r==='PONG').catch(()=>false);
  res.json({
    status: dbOk && redisOk ? 'healthy' : 'degraded',
    version: '2.4.1',
    timestamp: new Date().toISOString(),
    services: { database: dbOk, redis: redisOk, socket: io.engine.clientsCount },
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
app.use(`${v1}/appointments`,  appointmentRoutes);
app.use(`${v1}/whatsapp`,      whatsappRoutes);
app.use(`${v1}/audit`,          auditRoutes);
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
