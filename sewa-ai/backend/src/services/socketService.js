"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketIO = setupSocketIO;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
function setupSocketIO(io) {
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token)
                return next(new Error('No token'));
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            socket.data.user = decoded;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const { tenantId, id: userId, role } = socket.data.user || {};
        if (tenantId) {
            socket.join(`tenant:${tenantId}`);
            socket.join(`user:${userId}`);
            if (role === 'radiologist' || role === 'doctor')
                socket.join(`clinical:${tenantId}`);
            logger_1.logger.info(`[WS] Connected: ${userId} (${role}) tenant:${tenantId}`);
        }
        socket.on('join:scan', (scanId) => socket.join(`scan:${scanId}`));
        socket.on('disconnect', () => logger_1.logger.info(`[WS] Disconnected: ${userId}`));
    });
}
