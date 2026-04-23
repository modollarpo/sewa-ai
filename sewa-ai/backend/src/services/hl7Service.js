"use strict";
// SEWA AI — backend/src/services/hl7Service.ts
// Feature 9: HL7 v2 Integration — MLLP over TCP
// Exports:
//   - hl7Service singleton (used by strokeCodeService for buildADT_A02, buildORM, send)
//   - sendHL7ORM()  (used by scanController)
//   - sendHL7ORU()  (used by reportController)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hl7Service = void 0;
exports.sendHL7ORM = sendHL7ORM;
exports.sendHL7ORU = sendHL7ORU;
exports.sendHL7ADT = sendHL7ADT;
const net_1 = __importDefault(require("net"));
const uuid_1 = require("uuid");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
// MLLP framing constants (HL7 v2 over TCP)
const MLLP_START = new Uint8Array([0x0b]); // VT
const MLLP_END = new Uint8Array([0x1c, 0x0d]); // FS + CR
function wrapMLLP(message) {
    const content = new TextEncoder().encode(message);
    return Buffer.concat([MLLP_START, content, MLLP_END]);
}
function formatDate(d) {
    const dt = d ?? new Date();
    return dt.toISOString().replace(/[-:T]/g, '').slice(0, 12);
}
function msgId() {
    return (0, uuid_1.v4)().replace(/-/g, '').slice(0, 20);
}
// ── HL7Service class — singleton used by strokeCodeService ────
class HL7Service {
    /**
     * Build ADT^A02 (Transfer Patient) message
     * Used by strokeCodeService to transfer patient to stroke unit
     */
    buildADT_A02(scan, destinationUnit) {
        const id = msgId();
        const now = formatDate();
        return [
            `MSH|^~\\&|SEWA_AI|${env_1.config.HL7_FACILITY}|ADT|HOSPITAL|${now}||ADT^A02|${id}|P|2.5`,
            `EVN|A02|${now}`,
            `PID|1||${scan.patient?.mrn || 'UNKNOWN'}^^^SEWA^MR||${scan.patient?.user?.lastName || 'UNKNOWN'}^${scan.patient?.user?.firstName || ''}||${formatDate(scan.patient?.dateOfBirth)}|${scan.patient?.sex || 'U'}`,
            `PV1|1|E|${destinationUnit}^${destinationUnit}^${destinationUnit}|||||||NEURO|||||||`,
            `ZAI|SEWA_AI|${scan.aiResult?.primaryFinding || ''}|${scan.aiResult?.urgency || 'CRITICAL'}|STROKE_PROTOCOL`,
        ].join('\r');
    }
    /**
     * Build ORM^O01 (Order) message
     * Used by strokeCodeService to order CTA Head + Neck STAT
     */
    buildORM(scan, orderCode, priority = 'STAT') {
        const id = msgId();
        const now = formatDate();
        const priorityChar = priority === 'STAT' ? 'S' : priority === 'URGENT' ? 'A' : 'R';
        return [
            `MSH|^~\\&|SEWA_AI|${env_1.config.HL7_FACILITY}|RADIS|HOSPITAL|${now}||ORM^O01|${id}|P|2.5`,
            `PID|1||${scan.patient?.mrn || 'UNKNOWN'}^^^SEWA^MR||${scan.patient?.user?.lastName || 'UNKNOWN'}^${scan.patient?.user?.firstName || ''}||${formatDate(scan.patient?.dateOfBirth)}|${scan.patient?.sex || 'U'}`,
            `PV1|1|E|ER|||||||RAD`,
            `ORC|NW|${scan.id}||${scan.hl7OrderId || ''}|SC||^^^${now}|||||RAD`,
            `OBR|1|${scan.id}||${orderCode}^${orderCode}^SEWA|||${now}|||||||||RAD|||${priorityChar}`,
        ].join('\r');
    }
    /**
     * Send a pre-built HL7 message over MLLP TCP
     * Used by strokeCodeService after building messages
     */
    async send(message, tenantId) {
        const id = msgId();
        const result = await sendOverMLLP(message, id);
        if (result)
            logger_1.logger.info(`[HL7] Message sent for tenant=${tenantId} msgId=${id}`);
        return result;
    }
}
exports.hl7Service = new HL7Service();
// ── Standalone functions — used by scanController & reportController ──
/** ORM^O01 — called on scan upload */
async function sendHL7ORM(scan) {
    const id = msgId();
    const now = formatDate();
    const msg = [
        `MSH|^~\\&|SEWA_AI|${env_1.config.HL7_FACILITY}|PACS|HOSPITAL|${now}||ORM^O01|${id}|P|2.5`,
        `PID|1||${scan.patient?.mrn || 'UNKNOWN'}^^^SEWA^MR||${scan.patient?.user?.lastName || 'UNKNOWN'}^${scan.patient?.user?.firstName || ''}||${formatDate(scan.patient?.dateOfBirth)}|${scan.patient?.sex || 'U'}`,
        `PV1|1|O|RAD|||||||RAD`,
        `ORC|NW|${scan.id}||${scan.hl7OrderId || ''}|SC||^^^${now}|||||RAD`,
        `OBR|1|${scan.id}||${scan.modality}^${scan.bodyPart}^SEWA|||${now}|||||||||RAD|||${scan.priority === 'STAT' ? 'S' : scan.priority === 'URGENT' ? 'A' : 'R'}`,
    ].join('\r');
    return sendOverMLLP(msg, id);
}
/** ORU^R01 — called after report is signed OR on AI triage alert */
async function sendHL7ORU(data) {
    const id = msgId();
    const now = formatDate();
    // Handle both cases: a report object or raw triage data
    const scanId = data.scanId || data.id;
    const finding = data.finding || data.aiResult?.primaryFinding || '';
    const confidence = data.confidence !== undefined ? data.confidence : (data.aiResult?.confidence || 0);
    const impression = data.impression || '';
    const msg = [
        `MSH|^~\\&|SEWA_AI|${env_1.config.HL7_FACILITY}|EHR|HOSPITAL|${now}||ORU^R01|${id}|P|2.5`,
        `PID|1||${data.patient?.mrn || 'UNKNOWN'}^^^SEWA^MR||${data.patient?.user?.lastName || ''}^${data.patient?.user?.firstName || ''}`,
        `OBR|1|${scanId}||${data.modality || 'CT'}^${data.bodyPart || 'HEAD'}^SEWA|||${formatDate(data.receivedAt)}|||||||||||F`,
        `OBX|1|TX|RAD_REPORT^Radiology Report^SEWA||${impression.replace(/\r?\n/g, ' ')}||||||F`,
        `OBX|2|TX|AI_FINDING^AI Primary Finding^SEWA||${finding}||||||F`,
        `OBX|3|NM|AI_CONFIDENCE^AI Confidence^SEWA||${(confidence * 100).toFixed(1)}|%|||||F`,
    ].join('\r');
    return sendOverMLLP(msg, id);
}
/** ADT^A02 — called during stroke code activation */
async function sendHL7ADT(data) {
    const id = msgId();
    const now = formatDate();
    const msg = [
        `MSH|^~\\&|SEWA_AI|${env_1.config.HL7_FACILITY}|ADT|HOSPITAL|${now}||ADT^A02|${id}|P|2.5`,
        `EVN|A02|${now}`,
        `PID|1||${data.patient?.mrn || 'UNKNOWN'}^^^SEWA^MR||${data.patient?.user?.lastName || 'UNKNOWN'}^${data.patient?.user?.firstName || ''}||${formatDate(data.patient?.dateOfBirth)}|${data.patient?.sex || 'U'}`,
        `PV1|1|E|${data.destinationUnit || 'STROKE_UNIT'}^^^||||||||||||||`,
    ].join('\r');
    return sendOverMLLP(msg, id);
}
// ── Internal TCP/MLLP transport ───────────────────────────────
async function sendOverMLLP(message, id) {
    return new Promise((resolve) => {
        const socket = new net_1.default.Socket();
        socket.setTimeout(10_000);
        socket.connect(env_1.config.HL7_PORT, env_1.config.HL7_HOST, () => {
            socket.write(wrapMLLP(message));
        });
        socket.on('data', (data) => {
            const ack = data.toString('utf8').replace(/[\x0b\x1c\x0d]/g, '');
            if (ack.includes('AA')) {
                logger_1.logger.info(`[HL7] ACK received for ${id}`);
                resolve(id);
            }
            else {
                logger_1.logger.warn(`[HL7] NACK for ${id}: ${ack.slice(0, 100)}`);
                resolve(null);
            }
            socket.destroy();
        });
        socket.on('error', (err) => {
            logger_1.logger.warn(`[HL7] TCP error: ${err.message}`);
            resolve(null);
        });
        socket.on('timeout', () => {
            logger_1.logger.warn(`[HL7] TCP timeout for ${id}`);
            socket.destroy();
            resolve(null);
        });
    });
}
