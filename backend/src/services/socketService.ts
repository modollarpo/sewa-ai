// SEWA XAI — src/services/socketService.ts
// Socket.IO server setup with tenant room management
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prismaClient';
import { config } from '../config/env';

const JWT_SECRET = config.JWT_SECRET;
export function setupSocketIO(io: Server) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      socket.data.user = decoded;
      next();
    } catch { next(new Error('Invalid token')); }
  });
  io.on('connection', (socket) => {
    const { tenantId, id: userId, role } = socket.data.user || {};
    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
      socket.join(`user:${userId}`);
      if (role === 'radiologist' || role === 'doctor') socket.join(`clinical:${tenantId}`);
      logger.info(`[WS] Connected: ${userId} (${role}) tenant:${tenantId}`);
    }
    socket.on('join:scan', async (scanId) => {
      if (!tenantId) return;
      try {
        const scan = await prisma.scan.findFirst({ where: { id: scanId, tenantId } });
        if (scan) {
          socket.join(`scan:${scanId}`);
          logger.info(`[WS] ${userId} joined scan:${scanId}`);
        } else {
          logger.warn(`[WS] ${userId} denied access to scan:${scanId}`);
        }
      } catch (err) {
        logger.error(`[WS] Error joining scan: ${err}`);
      }
    });
    socket.on('disconnect', () => logger.info(`[WS] Disconnected: ${userId}`));
  });
}
