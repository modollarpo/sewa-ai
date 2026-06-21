// SEWA AI — backend/src/services/reportGenerationService.ts
// Clinical Diagnostic Report Generation (High-Fidelity HTML)
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';
import { uploadToStorage } from './storageService';

interface ReportData {
  reportNumber: string;
  signedAt: Date;
  patient: {
    name: string;
    mrn: string;
    dob: string;
    gender: string;
  };
  hospital: {
    name: string;
    address?: string;
    region: string;
  };
  scan: {
    modality: string;
    bodyPart: string;
    accessionNumber: string;
    receivedAt: Date;
  };
  findings: string;
  impression: string;
  technique: string;
  aiInsights?: {
    urgency: string;
    confidence: number;
    primaryFinding: string;
  };
  signedBy: {
    name: string;
    speciality: string;
    license: string;
  };
}

export async function generateClinicalPDF(reportId: string): Promise<string | null> {
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        scan: {
          include: {
            patient: { include: { user: true } },
            tenant: true,
            aiResult: true
          }
        },
        author: true
      }
    });

    if (!report) {
      logger.warn(`[ReportGen] Report not found: ${reportId}`);
      return null;
    }

    const { scan, author } = report;
    const { patient, tenant, aiResult } = scan;

    const data: ReportData = {
      reportNumber: `REP-${report.id.slice(0, 8).toUpperCase()}`,
      signedAt: report.signedAt || new Date(),
      patient: {
        name: patient ? `${patient.user.firstName} ${patient.user.lastName}` : 'Anonymous',
        mrn: patient?.mrn || 'N/A',
        dob: patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A',
        gender: (patient as any)?.sex || 'N/A',
      },
      hospital: {
        name: tenant.name,
        address: '', // Could pull from tenant metadata
        region: tenant.region,
      },
      scan: {
        modality: scan.modality,
        bodyPart: scan.bodyPart,
        accessionNumber: (scan as any).accessionNumber || scan.id.slice(0, 10),
        receivedAt: scan.receivedAt,
      },
      findings: report.findings || 'No specific findings recorded.',
      impression: report.impression || 'Normal study.',
      technique: report.technique || 'Standard protocol.',
      aiInsights: aiResult ? {
        urgency: aiResult.urgency,
        confidence: aiResult.confidence,
        primaryFinding: aiResult.primaryFinding,
      } : undefined,
      signedBy: {
        name: author ? `Dr. ${author.firstName} ${author.lastName}` : 'System Generated',
        speciality: author?.speciality || 'Radiologist',
        license: author?.licenseNumber || 'N/A',
      }
    };

    const html = renderClinicalReportHTML(data);

    // Upload as HTML for now (easy to view in browser/mobile)
    const fileName = `${data.reportNumber}.html`;
    const url = await uploadToStorage({
      tenantId: tenant.id,
      file: Buffer.from(html),
      fileName,
      contentType: 'text/html',
      folder: 'reports',
    });

    // Update report record with the URL
    await prisma.report.update({
      where: { id: reportId },
      data: { pdfUrl: url } // We'll keep calling it pdfUrl as it is the "Final Report URL"
    });

    return url;
  } catch (err: any) {
    logger.error(`[ReportGen] Failed: ${err.message}`);
    return null;
  }
}

function renderClinicalReportHTML(d: ReportData): string {
  const fmtDate = (dt: Date) => dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Clinical Report - ${d.reportNumber}</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 40px; color: #111; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
  .hosp-info h1 { margin: 0; font-size: 24px; color: #408D7B; }
  .hosp-info p { margin: 4px 0; font-size: 13px; color: #666; }
  .report-meta { text-align: right; }
  .report-meta h2 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
  .report-meta p { margin: 4px 0; font-size: 13px; font-weight: 600; }
  
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f9fafb; padding: 15px; border-radius: 8px; }
  .info-group h4 { margin: 0 0 5px; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
  .info-group p { margin: 0; font-size: 14px; font-weight: 500; }

  .section { margin-bottom: 25px; }
  .section h3 { margin: 0 0 10px; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; color: #333; text-transform: uppercase; }
  .section p { margin: 0; font-size: 15px; white-space: pre-wrap; }

  .ai-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin-bottom: 25px; }
  .ai-box h4 { margin: 0 0 8px; font-size: 12px; color: #166534; display: flex; align-items: center; gap: 6px; }
  .ai-box p { margin: 0; font-size: 14px; color: #14532d; font-style: italic; }

  .signature { margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; display: flex; justify-content: flex-end; }
  .sig-content { text-align: right; }
  .sig-content p { margin: 2px 0; font-size: 14px; }
  .sig-img { margin-bottom: 10px; font-family: 'Brush Script MT', cursive; font-size: 24px; color: #2E6B5E; }

  .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
</style>
</head>
<body>
<div class="header">
  <div class="hosp-info">
    <h1>${d.hospital.name}</h1>
    <p>Clinical Diagnostic Report</p>
    <p>${d.hospital.address || ''}</p>
  </div>
  <div class="report-meta">
    <h2>Medical Report</h2>
    <p>${d.reportNumber}</p>
    <p style="color:#666; font-weight:400">Date: ${fmtDate(d.signedAt)}</p>
  </div>
</div>

<div class="info-grid">
  <div class="info-group">
    <h4>Patient Name</h4>
    <p>${d.patient.name}</p>
  </div>
  <div class="info-group">
    <h4>MRN / ID</h4>
    <p>${d.patient.mrn}</p>
  </div>
  <div class="info-group">
    <h4>Date of Birth</h4>
    <p>${d.patient.dob}</p>
  </div>
  <div class="info-group">
    <h4>Gender</h4>
    <p>${d.patient.gender}</p>
  </div>
  <div class="info-group">
    <h4>Modality / Body Part</h4>
    <p>${d.scan.modality} - ${d.scan.bodyPart}</p>
  </div>
  <div class="info-group">
    <h4>Accession Number</h4>
    <p>${d.scan.accessionNumber}</p>
  </div>
</div>

<div class="section">
  <h3>Clinical Technique</h3>
  <p>${d.technique}</p>
</div>

${d.aiInsights ? `
<div class="ai-box">
  <h4>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14h.01M12 8v4"/></svg>
    AI TRIAGE ASSISTED ANALYSIS — CONFIDENCE: ${(d.aiInsights.confidence * 100).toFixed(1)}%
  </h4>
  <p>"${d.aiInsights.primaryFinding}" — Triage Category: <strong>${d.aiInsights.urgency}</strong></p>
</div>
` : ''}

<div class="section">
  <h3>Detailed Findings</h3>
  <p>${d.findings}</p>
</div>

<div class="section">
  <h3>Impression</h3>
  <p><strong>${d.impression}</strong></p>
</div>

<div class="signature">
  <div class="sig-content">
    <div class="sig-img">${d.signedBy.name}</div>
    <p><strong>${d.signedBy.name}</strong></p>
    <p>${d.signedBy.speciality}</p>
    <p>License: ${d.signedBy.license}</p>
    <p style="font-size:11px; color:#888; margin-top:5px">Electronically signed on ${fmtDate(d.signedAt)}</p>
  </div>
</div>

<div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:60px; padding-top:20px; border-top:1px solid #eee">
  <div style="display:flex; gap:15px; align-items:center">
    <div style="width:80px; height:80px; background:#fff; border:1px solid #ddd; padding:5px; border-radius:4px">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://verify.sewaxai.health/report/${d.reportNumber}" alt="Verification QR" style="width:100%; height:100%"/>
    </div>
    <div>
      <p style="margin:0; font-size:10px; font-weight:700; color:#333; text-transform:uppercase">Verify Authenticity</p>
      <p style="margin:2px 0 0; font-size:9px; color:#666; max-width:200px">Scan to verify this report on the SEWA Confidential Ledger (Azure Blockchain).</p>
    </div>
  </div>
  <div class="footer" style="margin:0; border:none; padding:0; text-align:right">
    This report was generated by SEWA AI Clinical Intelligence Platform.<br/>
    Stored securely at ${d.hospital.region.toUpperCase()} data residency zone.<br/>
    © 2026 Storegrill Inc Ltd.
  </div>
</div>
</body>
</html>`;
}
