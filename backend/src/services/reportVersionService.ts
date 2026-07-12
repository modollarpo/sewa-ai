import crypto from 'crypto';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

export async function snapshotReportVersion(
  reportId: string,
  editedBy: string,
  changeNote?: string,
): Promise<void> {
  try {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error(`Report ${reportId} not found`);

    const prevVersion = await prisma.reportVersion.findFirst({
      where: { reportId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (prevVersion?.version ?? 0) + 1;

    const content = JSON.stringify({
      technique: report.technique,
      findings: report.findings,
      impression: report.impression,
      recommendation: report.recommendation,
      fullText: report.fullText,
    });
    const sha256Hash = crypto.createHash('sha256').update(content).digest('hex');

    await prisma.reportVersion.create({
      data: {
        reportId,
        version,
        technique: report.technique,
        findings: report.findings,
        impression: report.impression,
        recommendation: report.recommendation,
        fullText: report.fullText,
        editedBy,
        changeNote,
        sha256Hash,
      },
    });

    logger.debug(`[ReportVersion] Snapshot v${version} saved for report ${reportId}`);
  } catch (err: any) {
    logger.error(`[ReportVersion] Failed to snapshot report ${reportId}: ${err.message}`);
  }
}

export async function listReportVersions(reportId: string) {
  return prisma.reportVersion.findMany({
    where: { reportId },
    orderBy: { version: 'desc' },
    select: { id: true, version: true, editedBy: true, changeNote: true, sha256Hash: true, createdAt: true },
  });
}

export async function getReportVersion(reportId: string, version: number) {
  return prisma.reportVersion.findUnique({
    where: { reportId_version: { reportId, version } },
  });
}

export async function verifyReportVersion(reportId: string, version: number): Promise<boolean> {
  const v = await prisma.reportVersion.findUnique({
    where: { reportId_version: { reportId, version } },
  });
  if (!v) return false;
  const content = JSON.stringify({
    technique: v.technique,
    findings: v.findings,
    impression: v.impression,
    recommendation: v.recommendation,
    fullText: v.fullText,
  });
  const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
  return expectedHash === v.sha256Hash;
}
