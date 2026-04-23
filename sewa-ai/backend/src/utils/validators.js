"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientConsentSchema = exports.PatientSchema = exports.TenantOnboardSchema = exports.AIResultSchema = void 0;
const zod_1 = require("zod");
// AI Triage Validation (Feature 3)
exports.AIResultSchema = zod_1.z.object({
    scanId: zod_1.z.string().uuid(),
    primaryFinding: zod_1.z.string().min(3),
    urgency: zod_1.z.enum(['CRITICAL', 'URGENT', 'NORMAL']),
    confidence: zod_1.z.number().min(0).max(1),
    uncertaintyScore: zod_1.z.number().optional(),
    metacognitionFlags: zod_1.z.array(zod_1.z.string()),
});
// Tenant Onboarding (Feature 1)
exports.TenantOnboardSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    slug: zod_1.z.string().regex(/^[a-z0-9-]+$/),
    region: zod_1.z.enum(['uk', 'eu', 'us', 'ng', 'ke', 'za', 'gh', 'in']),
    currency: zod_1.z.string().length(3),
    plan: zod_1.z.enum(['starter', 'pro', 'enterprise']),
});
// Patient Record (Feature 4)
exports.PatientSchema = zod_1.z.object({
    mrn: zod_1.z.string().min(1),
    dateOfBirth: zod_1.z.string().datetime().or(zod_1.z.date()),
    sex: zod_1.z.enum(['M', 'F', 'O']),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
});
exports.PatientConsentSchema = zod_1.z.object({
    consentAI: zod_1.z.boolean().optional(),
    consentResearch: zod_1.z.boolean().optional(),
    consentThirdParty: zod_1.z.boolean().optional(),
});
