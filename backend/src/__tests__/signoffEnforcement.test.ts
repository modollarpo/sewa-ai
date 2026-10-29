// SEWA XAI — backend/src/__tests__/signoffEnforcement.test.ts
// Automated Negative Verification of Consultant Sign-Off Enforcement & Artifact Suppression

import { signReport, updateReport, downloadReport } from '../controllers/reportController';
import { authorize, sameTenant } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { prisma } from '../utils/prismaClient';
import { generateClinicalPDF } from '../services/reportGenerationService';
import { createFHIRDiagnosticReport, createFHIRObservation } from '../services/fhirService';
import { sendHL7ORU } from '../services/hl7Service';
import { auditLog } from '../utils/audit';
import { io } from '../index';

// Mock downstream integrations
jest.mock('../utils/prismaClient', () => ({
  prisma: {
    report: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    scan: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    aCIFeedback: {
      create: jest.fn(),
    },
  },
  tenantStorage: {
    run: jest.fn((_, fn) => fn()),
  },
}));

jest.mock('../services/reportGenerationService', () => ({
  generateClinicalPDF: jest.fn().mockResolvedValue('https://storage.sewaxai.com/reports/test.pdf'),
}));

jest.mock('../services/fhirService', () => ({
  createFHIRDiagnosticReport: jest.fn().mockResolvedValue('fhir-diag-123'),
  createFHIRObservation: jest.fn().mockResolvedValue('fhir-obs-456'),
  getFHIRPatient: jest.fn(),
  getFHIRImagingStudy: jest.fn(),
}));

jest.mock('../services/hl7Service', () => ({
  sendHL7ORU: jest.fn().mockResolvedValue('hl7-oru-789'),
}));

jest.mock('../utils/audit', () => ({
  auditLog: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/reportVersionService', () => ({
  snapshotReportVersion: jest.fn().mockResolvedValue({ id: 'snapshot-1' }),
}));

jest.mock('../services/aiService', () => ({
  generateVLMReport: jest.fn(),
}));

jest.mock('../index', () => ({
  io: {
    to: jest.fn().mockReturnValue({
      emit: jest.fn(),
    }),
  },
}));

const mockRes = () => {
  const res: any = { statusCode: 200 };
  res.status = jest.fn((code: number) => { res.statusCode = code; return res; });
  res.json = jest.fn((data: any) => { res._data = data; return res; });
  res.redirect = jest.fn((url: string) => { res._redirect = url; return res; });
  return res;
};

describe('Sign-Off Enforcement Negative Automated Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Role-Based Access Control (RBAC) Gate Enforcement', () => {
    const invalidRoles = ['patient', 'nurse', 'technician', 'clinician', 'researcher', 'viewer'];

    invalidRoles.forEach((role) => {
      it(`blocks signReport for unauthorized role: ${role} with HTTP 403`, async () => {
        const req: any = {
          user: { id: 'usr-unauthorized', tenantId: 'tenant-nhs-1', role },
          params: { id: 'rep-100' },
          body: { acknowledgeReview: true },
        };
        const res = mockRes();
        const next = jest.fn();

        await signReport(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(403);
        expect(err.message).toMatch(/Only radiologists can sign reports/i);

        // Assert NO downstream clinical artifacts or dispatches occurred
        expect(generateClinicalPDF).not.toHaveBeenCalled();
        expect(createFHIRDiagnosticReport).not.toHaveBeenCalled();
        expect(sendHL7ORU).not.toHaveBeenCalled();
        expect(prisma.report.update).not.toHaveBeenCalled();
        expect(prisma.scan.update).not.toHaveBeenCalled();
      });

      it(`blocks route middleware authorize() for role: ${role} with HTTP 403`, () => {
        const middleware = authorize('radiologist', 'admin', 'superadmin');
        const req: any = { user: { id: 'usr-1', tenantId: 'tenant-1', role } };
        const res = mockRes();
        const next = jest.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe('Forbidden');
      });
    });

    it('blocks route middleware when req.user is absent with HTTP 401', () => {
      const middleware = authorize('radiologist');
      const req: any = {};
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Unauthorized');
    });
  });

  describe('2. AI Review Gate Acknowledgment Enforcement', () => {
    it('blocks signing when scan requires human review and acknowledgment is missing (HTTP 403)', async () => {
      const mockReport = {
        id: 'rep-flagged',
        tenantId: 'tenant-nhs-1',
        scanId: 'scan-flagged',
        status: 'draft',
        scan: {
          id: 'scan-flagged',
          requiresHumanReview: true,
          humanReviewReason: 'HIGH_UNCERTAINTY: Epistemic variance exceeds tau_epi threshold',
          patient: { user: { phone: '+447000000000', firstName: 'John' } },
          tenant: { name: 'NHS Trust 1' },
        },
      };

      (prisma.report.findFirst as jest.Mock).mockResolvedValue(mockReport);

      const req: any = {
        user: { id: 'rad-123', tenantId: 'tenant-nhs-1', role: 'radiologist' },
        params: { id: 'rep-flagged' },
        body: { acknowledgeReview: false }, // Explicit false
      };
      const res = mockRes();
      const next = jest.fn();

      await signReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('still flagged for human review');
      expect(err.message).toContain('HIGH_UNCERTAINTY');

      // Assert complete suppression of clinical side effects
      expect(prisma.report.update).not.toHaveBeenCalled();
      expect(prisma.scan.update).not.toHaveBeenCalled();
      expect(generateClinicalPDF).not.toHaveBeenCalled();
      expect(createFHIRDiagnosticReport).not.toHaveBeenCalled();
      expect(sendHL7ORU).not.toHaveBeenCalled();
    });

    it('blocks signing when acknowledgeReview is omitted from request body', async () => {
      const mockReport = {
        id: 'rep-flagged-2',
        tenantId: 'tenant-nhs-1',
        scanId: 'scan-flagged-2',
        status: 'draft',
        scan: {
          id: 'scan-flagged-2',
          requiresHumanReview: true,
          humanReviewReason: 'OOD_ESCALATION: Relative Mahalanobis distance exceeds tau_ood',
          patient: null,
          tenant: { name: 'NHS Trust 1' },
        },
      };

      (prisma.report.findFirst as jest.Mock).mockResolvedValue(mockReport);

      const req: any = {
        user: { id: 'rad-123', tenantId: 'tenant-nhs-1', role: 'radiologist' },
        params: { id: 'rep-flagged-2' },
        body: {}, // Omitted
      };
      const res = mockRes();
      const next = jest.fn();

      await signReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('still flagged for human review');
      expect(generateClinicalPDF).not.toHaveBeenCalled();
      expect(sendHL7ORU).not.toHaveBeenCalled();
    });
  });

  describe('3. Multi-Tenant Isolation & Cross-Tenant Intrusion Prevention', () => {
    it('blocks signing reports belonging to another tenant (HTTP 404)', async () => {
      // Tenant query returns null because tenantId does not match
      (prisma.report.findFirst as jest.Mock).mockResolvedValue(null);

      const req: any = {
        user: { id: 'rad-intruder', tenantId: 'tenant-attacker', role: 'radiologist' },
        params: { id: 'rep-victim-tenant' },
        body: { acknowledgeReview: true },
      };
      const res = mockRes();
      const next = jest.fn();

      await signReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Report not found');

      expect(generateClinicalPDF).not.toHaveBeenCalled();
      expect(createFHIRDiagnosticReport).not.toHaveBeenCalled();
      expect(sendHL7ORU).not.toHaveBeenCalled();
    });

    it('rejects cross-tenant header mismatch in sameTenant middleware (HTTP 403)', () => {
      const req: any = {
        headers: { 'x-tenant-id': 'tenant-foreign' },
        user: { id: 'rad-1', tenantId: 'tenant-home', role: 'radiologist' },
      };
      const res = mockRes();
      const next = jest.fn();

      sameTenant(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Cross-tenant access denied');
    });

    it('blocks downloading reports belonging to another tenant', async () => {
      (prisma.report.findUnique as jest.Mock).mockResolvedValue({
        id: 'rep-1',
        tenantId: 'tenant-victim',
        pdfUrl: 'https://storage/victim.pdf',
      });

      const req: any = {
        user: { id: 'usr-attacker', tenantId: 'tenant-attacker', role: 'radiologist' },
        params: { id: 'rep-1' },
      };
      const res = mockRes();
      const next = jest.fn();

      await downloadReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(404);
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  describe('4. Immutability & Modification Gating Post-Signing', () => {
    it('blocks modification/update of an approved report with HTTP 403', async () => {
      (prisma.report.findFirst as jest.Mock).mockResolvedValue({
        id: 'rep-already-signed',
        tenantId: 'tenant-nhs-1',
        status: 'approved',
        signedBy: 'rad-original',
        signedAt: new Date('2026-10-25T10:00:00Z'),
      });

      const req: any = {
        user: { id: 'rad-modifier', tenantId: 'tenant-nhs-1', role: 'radiologist' },
        params: { id: 'rep-already-signed' },
        body: { findings: 'Tampered findings text' },
      };
      const res = mockRes();
      const next = jest.fn();

      await updateReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('Cannot modify a signed report. An addendum must be created instead.');

      // Assert database update was never executed
      expect(prisma.report.update).not.toHaveBeenCalled();
    });

    it('rejects double-signing of an already approved report with HTTP 409', async () => {
      (prisma.report.findFirst as jest.Mock).mockResolvedValue({
        id: 'rep-already-approved',
        tenantId: 'tenant-nhs-1',
        status: 'approved',
        signedBy: 'rad-first',
        scan: { id: 'scan-1', requiresHumanReview: false },
      });

      const req: any = {
        user: { id: 'rad-second', tenantId: 'tenant-nhs-1', role: 'radiologist' },
        params: { id: 'rep-already-approved' },
        body: { acknowledgeReview: true },
      };
      const res = mockRes();
      const next = jest.fn();

      await signReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Report already signed');

      expect(generateClinicalPDF).not.toHaveBeenCalled();
      expect(sendHL7ORU).not.toHaveBeenCalled();
    });
  });

  describe('5. Database Integrity CHECK Constraint Simulation', () => {
    it('verifies SQL CHECK constraint logic: status="approved" requires non-null signedBy and signedAt', () => {
      // Mirrors migration constraint:
      // CHECK (status != 'approved' OR (signed_by IS NOT NULL AND signed_at IS NOT NULL))
      const validateDbCheckConstraint = (record: { status: string; signedBy: string | null; signedAt: Date | null }) => {
        if (record.status === 'approved') {
          return record.signedBy !== null && record.signedAt !== null;
        }
        return true;
      };

      // Negative scenarios: forged/missing signature metadata with approved status
      expect(validateDbCheckConstraint({ status: 'approved', signedBy: null, signedAt: new Date() })).toBe(false);
      expect(validateDbCheckConstraint({ status: 'approved', signedBy: 'rad-1', signedAt: null })).toBe(false);
      expect(validateDbCheckConstraint({ status: 'approved', signedBy: null, signedAt: null })).toBe(false);

      // Positive scenarios
      expect(validateDbCheckConstraint({ status: 'approved', signedBy: 'rad-1', signedAt: new Date() })).toBe(true);
      expect(validateDbCheckConstraint({ status: 'draft', signedBy: null, signedAt: null })).toBe(true);
    });
  });

  describe('6. Positive Authorized Flow (Sanity Verification)', () => {
    it('successfully approves report and triggers downstream pipeline when fully authorized', async () => {
      const mockReport = {
        id: 'rep-valid',
        tenantId: 'tenant-nhs-1',
        scanId: 'scan-valid',
        status: 'draft',
        scan: {
          id: 'scan-valid',
          requiresHumanReview: true,
          humanReviewReason: 'METRIC_REVIEW',
          patient: { user: { phone: '+447000000000', firstName: 'Alice' } },
          tenant: { name: 'Royal Free NHS Trust' },
        },
      };

      (prisma.report.findFirst as jest.Mock).mockResolvedValue(mockReport);
      (prisma.report.update as jest.Mock).mockResolvedValue({
        id: 'rep-valid',
        status: 'approved',
        signedBy: 'rad-authorized',
        signedAt: new Date(),
      });
      (prisma.scan.findUnique as jest.Mock).mockResolvedValue({
        id: 'scan-valid',
        aiResult: { id: 'ai-1', score: 0.85 },
      });

      const req: any = {
        user: { id: 'rad-authorized', tenantId: 'tenant-nhs-1', role: 'radiologist' },
        params: { id: 'rep-valid' },
        body: { acknowledgeReview: true }, // Explicitly acknowledged
      };
      const res = mockRes();
      const next = jest.fn();

      await signReport(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(prisma.report.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rep-valid' },
          data: expect.objectContaining({
            status: 'approved',
            signedBy: 'rad-authorized',
          }),
        })
      );
      expect(generateClinicalPDF).toHaveBeenCalledWith('rep-valid');
      expect(createFHIRDiagnosticReport).toHaveBeenCalled();
      expect(sendHL7ORU).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          report: expect.objectContaining({ status: 'approved' }),
        })
      );
    });
  });
});
