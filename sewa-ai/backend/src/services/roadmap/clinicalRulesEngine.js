"use strict";
// SEWA AI — backend/src/services/roadmap/clinicalRulesEngine.ts
// Roadmap Feature 9: Clinical Decision Support Rules Engine
// Configurable IF/THEN rules that fire on AI findings → automatic clinical actions
Object.defineProperty(exports, "__esModule", { value: true });
exports.clinicalRulesEngine = exports.BUILT_IN_RULES = void 0;
const database_1 = require("../../config/database");
const redis_1 = require("../../config/redis");
const notificationService_1 = require("../notifications/notificationService");
const hl7Service_1 = require("../hl7Service");
const logger_1 = require("../../utils/logger");
const audit_1 = require("../../utils/audit");
// ── Built-in NICE / WHO pathway rules ──────────────────────────
exports.BUILT_IN_RULES = [
    {
        name: 'Stroke Code Activation — LVO',
        description: 'Activates stroke code when large vessel occlusion detected with high confidence',
        enabled: true,
        pathway: 'stroke',
        conditionLogic: 'AND',
        conditions: [
            { field: 'finding', operator: 'contains', value: 'occlusion' },
            { field: 'urgency', operator: 'eq', value: 'CRITICAL' },
            { field: 'confidence', operator: 'gte', value: 0.85 },
            { field: 'modality', operator: 'eq', value: 'CT' },
        ],
        actions: [
            { type: 'notify_role', target: 'radiologist', message: '🚨 STROKE CODE: LVO detected. Immediate review required.' },
            { type: 'notify_role', target: 'doctor', message: '🚨 STROKE CODE ACTIVATED. Neuro team alert.' },
            { type: 'notify_oncall', target: 'neuroradiology', message: 'LVO on CT — stroke code active. Patient requires urgent CTA.' },
            { type: 'hl7_order', hl7Data: { orderCode: 'CTA_HEAD_NECK', priority: 'STAT', reason: 'LVO_SUSPECTED' } },
            { type: 'page_team', target: 'stroke_response_team' },
        ],
        cooldownMs: 3_600_000, // 1 hour
    },
    {
        name: 'ICH Critical Alert',
        description: 'Pages neurosurgery on-call for intracranial haemorrhage',
        enabled: true,
        pathway: 'stroke',
        conditionLogic: 'AND',
        conditions: [
            { field: 'finding', operator: 'in', value: ['ICH', 'intracranial hemorrhage', 'intracranial haemorrhage'] },
            { field: 'urgency', operator: 'eq', value: 'CRITICAL' },
        ],
        actions: [
            { type: 'notify_role', target: 'doctor', message: '🔴 ICH DETECTED — Neurosurgery review urgently required.' },
            { type: 'notify_oncall', target: 'neurosurgery', message: 'CT Head: ICH confirmed. Patient may require surgical intervention.' },
            { type: 'escalate_priority', priority: 'STAT' },
        ],
        cooldownMs: 1_800_000,
    },
    {
        name: 'Pulmonary Embolism — Anticoagulation Alert',
        description: 'Alerts emergency team for PE findings',
        enabled: true,
        pathway: 'pe',
        conditionLogic: 'AND',
        conditions: [
            { field: 'finding', operator: 'contains', value: 'embolism' },
            { field: 'urgency', operator: 'in', value: ['CRITICAL', 'URGENT'] },
        ],
        actions: [
            { type: 'notify_role', target: 'doctor', message: '⚠️ PE DETECTED — Anticoagulation assessment required urgently.' },
            { type: 'notify_oncall', target: 'cardiology', message: 'CT Chest: PE confirmed. Consider anticoagulation / thrombolysis.' },
            { type: 'hl7_order', hl7Data: { orderCode: 'D_DIMER', priority: 'STAT', reason: 'PE_CONFIRMED' } },
        ],
        cooldownMs: 1_800_000,
    },
    {
        name: 'TB Suspected — Infection Control',
        description: 'Triggers infection control protocol for TB findings in Africa regions',
        enabled: true,
        pathway: 'tb',
        conditionLogic: 'AND',
        conditions: [
            { field: 'finding', operator: 'contains', value: 'TB' },
            { field: 'confidence', operator: 'gte', value: 0.75 },
        ],
        actions: [
            { type: 'notify_role', target: 'doctor', message: 'TB SUSPECTED — Isolation and sputum culture recommended.' },
            { type: 'create_task', message: 'Initiate TB isolation protocol per WHO guidelines' },
            { type: 'hl7_order', hl7Data: { orderCode: 'SPUTUM_CULTURE', priority: 'URGENT', reason: 'TB_SUSPECTED' } },
        ],
        cooldownMs: 86_400_000, // 24h
    },
    {
        name: 'Low AI Confidence — Flag for Second Opinion',
        description: 'Routes uncertain cases to second opinion queue',
        enabled: true,
        conditionLogic: 'AND',
        conditions: [
            { field: 'confidence', operator: 'lt', value: 0.70 },
            { field: 'uncertainty', operator: 'gte', value: 0.25 },
        ],
        actions: [
            { type: 'notify_role', target: 'radiologist', message: '⚠️ Low AI confidence — second opinion recommended.' },
            { type: 'create_task', message: 'Manual review required: AI confidence below threshold' },
        ],
        cooldownMs: 300_000,
    },
];
// ── Rules Engine ───────────────────────────────────────────────
class ClinicalRulesEngine {
    /** Evaluate all enabled tenant rules against an AI result */
    async evaluate(tenantId, scanId, aiResult) {
        const rules = await this.getRules(tenantId);
        const triggered = [];
        const actionsTaken = [];
        for (const rule of rules) {
            if (!rule.enabled)
                continue;
            // Cooldown check
            const cooldownKey = `rules:cooldown:${tenantId}:${rule.id}:${scanId.slice(0, 8)}`;
            const onCooldown = await redis_1.redisClient.get(cooldownKey);
            if (onCooldown)
                continue;
            const matches = rule.conditionLogic === 'AND'
                ? rule.conditions.every(c => this.matchCondition(c, aiResult))
                : rule.conditions.some(c => this.matchCondition(c, aiResult));
            if (!matches)
                continue;
            // Set cooldown
            await redis_1.redisClient.setex(cooldownKey, Math.floor(rule.cooldownMs / 1000), '1');
            triggered.push(rule.name);
            // Execute actions
            for (const action of rule.actions) {
                const result = await this.executeAction(action, tenantId, scanId, rule, aiResult);
                actionsTaken.push(result);
            }
            // Audit trail
            await (0, audit_1.auditLog)({
                tenantId,
                action: 'CLINICAL_RULE_TRIGGERED',
                entity: 'Scan',
                entityId: scanId,
                metadata: { ruleName: rule.name, pathway: rule.pathway, actionsCount: rule.actions.length },
            });
        }
        return { triggered, actions: actionsTaken };
    }
    matchCondition(condition, result) {
        const value = result[condition.field];
        if (value === undefined || value === null)
            return false;
        switch (condition.operator) {
            case 'eq': return String(value).toLowerCase() === String(condition.value).toLowerCase();
            case 'neq': return String(value).toLowerCase() !== String(condition.value).toLowerCase();
            case 'gt': return Number(value) > Number(condition.value);
            case 'lt': return Number(value) < Number(condition.value);
            case 'gte': return Number(value) >= Number(condition.value);
            case 'lte': return Number(value) <= Number(condition.value);
            case 'contains': return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
            case 'in': return Array.isArray(condition.value) &&
                condition.value.some(v => String(v).toLowerCase() === String(value).toLowerCase());
            default: return false;
        }
    }
    async executeAction(action, tenantId, scanId, rule, aiResult) {
        try {
            switch (action.type) {
                case 'notify_role': {
                    const users = await database_1.prisma.user.findMany({ where: { tenantId, role: action.target, status: 'active' } });
                    for (const user of users) {
                        await (0, notificationService_1.notifyUsers)({
                            tenantId,
                            userIds: [user.id],
                            type: aiResult.urgency === 'CRITICAL' ? 'critical_finding' : 'ai_result',
                            title: `Rule: ${rule.name}`,
                            body: action.message || 'Clinical rule triggered',
                            data: { scanId, ruleId: rule.id, pathway: rule.pathway || '' },
                        });
                    }
                    return `notify_role:${action.target}:${users.length}users`;
                }
                case 'notify_oncall': {
                    // In production: integrate with on-call scheduling (PagerDuty / NHS RTMS)
                    logger_1.logger.info(`On-call page: team=${action.target}, rule=${rule.name}, scan=${scanId}`);
                    return `notify_oncall:${action.target}`;
                }
                case 'hl7_order': {
                    if (action.hl7Data) {
                        const scan = await database_1.prisma.scan.findUnique({ where: { id: scanId }, include: { patient: true } });
                        const message = hl7Service_1.hl7Service.buildORM(scan, action.hl7Data.orderCode, action.hl7Data.priority);
                        await hl7Service_1.hl7Service.send(message, tenantId);
                        return `hl7_order:${action.hl7Data.orderCode}`;
                    }
                    return 'hl7_order:skipped';
                }
                case 'escalate_priority': {
                    await database_1.prisma.scan.update({ where: { id: scanId }, data: { priority: action.priority || 'STAT' } });
                    return `escalate_priority:${action.priority}`;
                }
                case 'create_task': {
                    // Create notification task for responsible clinicians
                    logger_1.logger.info(`Task created: ${action.message} for scan ${scanId}`);
                    return `create_task:${action.message?.slice(0, 40)}`;
                }
                case 'webhook': {
                    if (action.target) {
                        await fetch(action.target, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ event: 'rule_triggered', rule: rule.name, scanId, aiResult }),
                        });
                    }
                    return `webhook:${action.target?.slice(0, 40)}`;
                }
                default:
                    return `unknown_action:${action.type}`;
            }
        }
        catch (err) {
            logger_1.logger.error(`Rule action failed: ${action.type}`, err);
            return `failed:${action.type}`;
        }
    }
    async getRules(tenantId) {
        // Production: fetch from DB. For now return built-ins + tenant custom rules.
        const builtIns = exports.BUILT_IN_RULES.map((r, i) => ({
            ...r, id: `builtin-${i}`, tenantId, createdBy: 'system', version: 1,
        }));
        // TODO: merge with tenant-specific rules from prisma.clinicalRule.findMany({ where: { tenantId } })
        return builtIns;
    }
}
exports.clinicalRulesEngine = new ClinicalRulesEngine();
