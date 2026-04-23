"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.sameTenat = sameTenat;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const AppError_1 = require("../utils/AppError");
function authenticate(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
        return next(new AppError_1.AppError('Unauthorized', 401));
    const token = header.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.config.JWT_SECRET);
        req.user = { id: payload.sub, tenantId: payload.tenantId, role: payload.role };
        next();
    }
    catch {
        next(new AppError_1.AppError('Token invalid or expired', 401));
    }
}
function authorize(...roles) {
    return (req, _res, next) => {
        if (!req.user)
            return next(new AppError_1.AppError('Unauthorized', 401));
        if (!roles.includes(req.user.role))
            return next(new AppError_1.AppError('Forbidden', 403));
        next();
    };
}
// Ensure request belongs to same tenant
function sameTenat(req, _res, next) {
    const tid = req.headers['x-tenant-id'];
    if (tid && req.user && tid !== req.user.tenantId) {
        return next(new AppError_1.AppError('Cross-tenant access denied', 403));
    }
    next();
}
