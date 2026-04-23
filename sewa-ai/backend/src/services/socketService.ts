// SEWA AI — src/services/socketService.ts
// Socket.IO server setup with tenant room management
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
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
    socket.on('join:scan', (scanId) => socket.join(`scan:${scanId}`));
    socket.on('disconnect', () => logger.info(`[WS] Disconnected: ${userId}`));
  });
}
