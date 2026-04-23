"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAIPipeline = exports.triggerAITriage = void 0;
exports.generateVLMReport = generateVLMReport;
// SEWA AI — src/services/aiService.ts
// AI service exports — delegates to aiOrchestrator and VLM engine
const axios_1 = __importDefault(require("axios"));
var aiOrchestrator_1 = require("./aiOrchestrator");
Object.defineProperty(exports, "triggerAITriage", { enumerable: true, get: function () { return aiOrchestrator_1.triggerAITriage; } });
Object.defineProperty(exports, "runAIPipeline", { enumerable: true, get: function () { return aiOrchestrator_1.runAIPipeline; } });
const VLM_URL = process.env.VLM_URL || 'http://sewa-vlm-report:8001';
async function generateVLMReport(scanId, tenantId) {
    const resp = await axios_1.default.post(`${VLM_URL}/generate`, { scan_id: scanId, tenant_id: tenantId }, { timeout: 45_000 });
    return resp.data;
}
