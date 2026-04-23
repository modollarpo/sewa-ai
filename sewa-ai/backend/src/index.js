"use strict";
// SEWA AI Backend — src/index.ts
// Node.js 18+ | Express.js | TypeScript | Socket.IO
// README.pdf tech stack: Runtime Node.js 18+, Framework Express.js
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const requestId_1 = require("./middleware/requestId");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./middleware/rateLimiter");
const audit_1 = require("./middleware/audit");
const socketService_1 = require("./services/socketService");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const scans_1 = __importDefault(require("./routes/scans"));
const reports_1 = __importDefault(require("./routes/reports"));
const patients_1 = __importDefault(require("./routes/patients"));
const ai_1 = __importDefault(require("./routes/ai"));
const payments_1 = __importDefault(require("./routes/payments"));
const tenants_1 = __importDefault(require("./routes/tenants"));
const users_1 = __importDefault(require("./routes/users"));
const fhir_1 = __importDefault(require("./routes/fhir"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const admin_1 = __importDefault(require("./routes/admin"));
const templates_1 = __importDefault(require("./routes/templates"));
const annotations_1 = __importDefault(require("./routes/annotations"));
const secondOpinions_1 = __importDefault(require("./routes/secondOpinions"));
const audit_2 = __importDefault(require("./routes/audit"));
const index_1 = __importDefault(require("./routes/roadmap/index"));
const index_2 = __importStar(require("./routes/appointments/index"));
const whatsapp_1 = __importDefault(require("./routes/whatsapp"));
const referralNetworkService_1 = require("./services/roadmap/referralNetworkService");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// ── Socket.IO — Feature 6 (Real-time Notifications) ───────────
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: env_1.config.CORS_ORIGINS, credentials: true },
    transports: ['websocket', 'polling'],
});
exports.io = io;
(0, socketService_1.setupSocketIO)(io);
// ── Security & Middleware ──────────────────────────────────────
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'blob:', '*.sewaxai.health'],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: env_1.config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Region'],
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, morgan_1.default)('combined', { stream: { write: msg => logger_1.logger.info(msg.trim()) } }));
app.use(requestId_1.requestId);
app.use(rateLimiter_1.rateLimiter);
app.use(audit_1.auditMiddleware);
// ── Health ─────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
    const dbOk = await database_1.prisma.$queryRaw `SELECT 1`.then(() => true).catch(() => false);
    const redisOk = await redis_1.redisClient.ping().then(r => r === 'PONG').catch(() => false);
    res.json({
        status: dbOk && redisOk ? 'healthy' : 'degraded',
        version: '2.4.1',
        timestamp: new Date().toISOString(),
        services: { database: dbOk, redis: redisOk, socket: io.engine.clientsCount },
    });
});
// ── API Routes ─────────────────────────────────────────────────
const v1 = '/api/v1';
app.use(`${v1}/auth`, auth_1.default);
app.use(`${v1}/scans`, scans_1.default);
app.use(`${v1}/reports`, reports_1.default);
app.use(`${v1}/patients`, patients_1.default);
app.use(`${v1}/ai`, ai_1.default);
app.use(`${v1}/payments`, payments_1.default);
app.use(`${v1}/tenants`, tenants_1.default);
app.use(`${v1}/users`, users_1.default);
app.use(`${v1}/fhir`, fhir_1.default);
app.use(`${v1}/notifications`, notifications_1.default);
app.use(`${v1}/analytics`, analytics_1.default);
app.use(`${v1}/admin`, admin_1.default);
app.use(`${v1}/templates`, templates_1.default);
app.use(`${v1}/annotations`, annotations_1.default);
app.use(`${v1}/second-opinions`, secondOpinions_1.default);
app.use(`${v1}/appointments`, index_2.default);
app.use(`${v1}/whatsapp`, whatsapp_1.default);
app.use(`${v1}/audit`, audit_2.default);
app.use(`${v1}`, index_1.default); // Roadmap features: /rules, /stroke-codes, /population-health, /referrals, /federated-learning, /continuous-learning
app.use(errorHandler_1.errorHandler);
// ── Startup ────────────────────────────────────────────────────
async function bootstrap() {
    try {
        await database_1.prisma.$connect();
        logger_1.logger.info('PostgreSQL connected');
        httpServer.listen(env_1.config.PORT, () => {
            logger_1.logger.info(`SEWA AI Backend running on port ${env_1.config.PORT}`);
            logger_1.logger.info(`Environment: ${env_1.config.NODE_ENV}`);
            logger_1.logger.info(`Region: ${env_1.config.REGION}`);
        });
        // ── Appointment reminder cron — every hour ─────────────────
        setInterval(async () => {
            try {
                await (0, index_2.sendAppointmentReminders)();
            }
            catch (e) {
                logger_1.logger.error('[Cron] Appointment reminder failed:', e.message);
            }
        }, 60 * 60 * 1000);
        logger_1.logger.info('[Cron] Appointment reminder scheduler started (hourly)');
        // ── Referral SLA escalation cron — every 30 minutes ───────
        setInterval(async () => {
            try {
                await (0, referralNetworkService_1.escalateOverdueReferrals)();
            }
            catch (e) {
                logger_1.logger.error('[Cron] Referral SLA escalation failed:', e.message);
            }
        }, 30 * 60 * 1000);
        logger_1.logger.info('[Cron] Referral SLA escalation scheduler started (every 30 min)');
    }
    catch (err) {
        logger_1.logger.error('Bootstrap error:', err);
        process.exit(1);
    }
}
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received — graceful shutdown');
    await database_1.prisma.$disconnect();
    await redis_1.redisClient.quit();
    process.exit(0);
});
bootstrap();
