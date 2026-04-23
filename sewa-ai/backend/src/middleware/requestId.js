"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = requestId;
const crypto_1 = require("crypto");
function requestId(req, res, next) {
    const id = req.headers['x-request-id'] || (0, crypto_1.randomUUID)();
    req.requestId = id;
    req.startTime = Date.now();
    res.setHeader('X-Request-ID', id);
    // Note: Cannot set headers in 'finish' event. Response time is logged via Morgan/logger.
    next();
}
