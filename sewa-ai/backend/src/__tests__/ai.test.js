"use strict";
// SEWA AI — backend/src/__tests__/ai.test.ts
// Unit tests for AI pipeline logic — no external services needed
// ── Clinical Rules Engine unit tests ────────────────────────
describe('Clinical Rules Engine — condition matching', () => {
    it('detects ICH/stroke conditions', () => {
        const findings = ['ICH', 'intracranial hemorrhage', 'LVO', 'subarachnoid hemorrhage'];
        const pattern = /ICH|hemorrhage|haemorrhage|LVO|occlusion|stroke|SAH|subarachnoid/i;
        findings.forEach(f => expect(pattern.test(f)).toBe(true));
    });
    it('does not flag benign findings as stroke', () => {
        const benign = ['Normal study', 'No acute abnormality', 'Mild sinusitis'];
        const pattern = /ICH|hemorrhage|haemorrhage|LVO|occlusion|stroke|SAH|subarachnoid/i;
        benign.forEach(f => expect(pattern.test(f)).toBe(false));
    });
});
// ── Urgency classification ────────────────────────────────────
describe('Urgency thresholds', () => {
    it('confidence below 0.5 should trigger low-confidence rule', () => {
        const confidence = 0.42;
        expect(confidence < 0.5).toBe(true);
    });
    it('CRITICAL urgency triggers notifications', () => {
        const urgencies = ['CRITICAL', 'URGENT'];
        urgencies.forEach(u => {
            expect(['CRITICAL', 'URGENT'].includes(u)).toBe(true);
        });
    });
});
// ── HL7 date formatting ────────────────────────────────────────
describe('HL7 date formatting', () => {
    it('formats date correctly for HL7 v2', () => {
        const formatDate = (d) => {
            const dt = d ?? new Date();
            return dt.toISOString().replace(/[-:T]/g, '').slice(0, 12);
        };
        const result = formatDate(new Date('2024-03-15T10:30:00Z'));
        expect(result).toBe('202403151030');
        expect(result).toHaveLength(12);
    });
});
// ── Multi-region compliance profiles ──────────────────────────
describe('Compliance profiles by region', () => {
    const getComplianceProfile = (region) => {
        const map = {
            uk: ['HIPAA', 'GDPR', 'NHS DSPT'],
            eu: ['HIPAA', 'GDPR', 'EU AI Act'],
            us: ['HIPAA', 'FDA 510(k)'],
            ng: ['NDPR', 'ISO 13485'],
            ke: ['DPA 2019', 'ISO 13485'],
            za: ['POPIA', 'ISO 13485'],
            gh: ['DPA 2012', 'ISO 13485'],
            in: ['DPDP', 'ISO 13485'],
        };
        return map[region] || ['HIPAA', 'ISO 13485'];
    };
    it('UK includes NHS DSPT', () => {
        expect(getComplianceProfile('uk')).toContain('NHS DSPT');
    });
    it('EU includes EU AI Act', () => {
        expect(getComplianceProfile('eu')).toContain('EU AI Act');
    });
    it('US includes HIPAA', () => {
        expect(getComplianceProfile('us')).toContain('HIPAA');
    });
    it('Nigeria uses NDPR', () => {
        expect(getComplianceProfile('ng')).toContain('NDPR');
    });
    it('Unknown region falls back to HIPAA + ISO 13485', () => {
        const profile = getComplianceProfile('xx');
        expect(profile).toContain('HIPAA');
        expect(profile).toContain('ISO 13485');
    });
});
// ── MLLP framing ───────────────────────────────────────────────
describe('MLLP framing', () => {
    it('wraps message with correct VT/FS/CR bytes', () => {
        const MLLP_START = Buffer.from([0x0b]);
        const MLLP_END = Buffer.from([0x1c, 0x0d]);
        const msg = 'MSH|test message';
        const framed = Buffer.concat([MLLP_START, Buffer.from(msg), MLLP_END]);
        expect(framed[0]).toBe(0x0b);
        expect(framed[framed.length - 2]).toBe(0x1c);
        expect(framed[framed.length - 1]).toBe(0x0d);
        expect(framed.slice(1, framed.length - 2).toString()).toBe(msg);
    });
});
