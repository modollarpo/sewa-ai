"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = auditMiddleware;
const audit_1 = require("../utils/audit");
const AUDITED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
function auditMiddleware(req, res, next) {
    if (!AUDITED_METHODS.includes(req.method) || req.path === '/health')
        return next();
    res.on('finish', () => {
        if (res.statusCode < 400 && req.user) {
            (0, audit_1.auditLog)({
                tenantId: req.user.tenantId,
                userId: req.user.id,
                action: `${req.method} ${req.path}`,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { status: res.statusCode },
            }).catch(() => { });
        }
    });
    next();
}
