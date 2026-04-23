"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const AppError_1 = require("../utils/AppError");
const logger_1 = require("../utils/logger");
function errorHandler(err, req, res, _next) {
    const status = err instanceof AppError_1.AppError ? err.statusCode : 500;
    const message = err instanceof AppError_1.AppError ? err.message : 'Internal server error';
    if (status >= 500)
        logger_1.logger.error(`${req.method} ${req.path} → ${status}`, err);
    res.status(status).json({ success: false, message, ...(err.code ? { code: err.code } : {}) });
}
