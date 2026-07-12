import { prisma } from '../utils/prismaClient';

interface PipelineMetric {
  scanId: string;
  tenantId: string;
  stage: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

interface SystemMetric {
  timestamp: string;
  cpuUsage?: number;
  memoryUsage?: number;
  activeWorkers: number;
  queueDepth: number;
  pipelineLatencyP50: number;
  pipelineLatencyP95: number;
  pipelineLatencyP99: number;
  successRate: number;
  errorRate: number;
}

interface SecurityEvent {
  type: string;
  userId?: string;
  ip?: string;
  detail: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

const metricBuffer: PipelineMetric[] = [];
let flushInterval: ReturnType<typeof setInterval> | null = null;

export function logPipelineMetric(metric: PipelineMetric): void {
  const entry = {
    level: metric.success ? 'info' : 'error',
    category: 'pipeline',
    timestamp: new Date().toISOString(),
    ...metric,
  };
  console.log(JSON.stringify(entry));

  metricBuffer.push(metric);
  if (metricBuffer.length >= 50) {
    void flushMetrics();
  }
}

export function logSystemMetric({ timestamp, ...rest }: SystemMetric): void {
  const entry = {
    level: 'info',
    category: 'system',
    timestamp,
    ...rest,
  };
  console.log(JSON.stringify(entry));
}

export function logSecurityEvent(event: SecurityEvent): void {
  const entry = {
    level: event.severity === 'critical' || event.severity === 'high' ? 'error' : 'warn',
    category: 'security',
    timestamp: new Date().toISOString(),
    ...event,
  };
  console.log(JSON.stringify(entry));
}

async function flushMetrics(): Promise<void> {
  if (metricBuffer.length === 0) return;

  const batch = metricBuffer.splice(0);
  try {
    await prisma.auditLog.createMany({
      data: batch.map((m) => ({
        tenantId: m.tenantId,
        action: `PIPELINE_${m.stage.toUpperCase()}`,
        entity: 'Scan',
        entityId: m.scanId,
        detail: JSON.stringify({
          stage: m.stage,
          durationMs: m.durationMs,
          success: m.success,
          errorMessage: m.errorMessage,
          ...m.metadata,
        }),
      })),
      skipDuplicates: true,
    });
  } catch {
    console.log(JSON.stringify({
      level: 'error',
      category: 'observability',
      message: 'Failed to flush pipeline metrics to database',
      count: batch.length,
    }));
  }
}

export async function getPipelineMetrics(
  tenantId: string,
  hours: number
): Promise<{
  totalScans: number;
  successRate: number;
  avgDurationMs: number;
  stageBreakdown: Record<string, { count: number; avgMs: number; errorCount: number }>;
}> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      action: { startsWith: 'PIPELINE_' },
      createdAt: { gte: since },
    },
    select: { action: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });

  const stageMap: Record<string, { count: number; totalMs: number; errorCount: number }> = {};

  for (const log of logs) {
    const stage = log.action.replace('PIPELINE_', '').toLowerCase();
    const meta = log.metadata ? log.metadata as Record<string, unknown> : {};
    const duration = typeof meta.durationMs === 'number' ? meta.durationMs : 0;
    const success = meta.success !== false;

    if (!stageMap[stage]) {
      stageMap[stage] = { count: 0, totalMs: 0, errorCount: 0 };
    }
    stageMap[stage].count++;
    stageMap[stage].totalMs += duration;
    if (!success) stageMap[stage].errorCount++;
  }

  const totalScans = logs.length;
  const totalErrors = Object.values(stageMap).reduce((s, v) => s + v.errorCount, 0);
  const totalMs = Object.values(stageMap).reduce((s, v) => s + v.totalMs, 0);

  return {
    totalScans,
    successRate: totalScans > 0 ? (totalScans - totalErrors) / totalScans : 1,
    avgDurationMs: totalScans > 0 ? totalMs / totalScans : 0,
    stageBreakdown: Object.fromEntries(
      Object.entries(stageMap).map(([k, v]) => [
        k,
        { count: v.count, avgMs: v.count > 0 ? v.totalMs / v.count : 0, errorCount: v.errorCount },
      ])
    ),
  };
}

export async function getSystemHealth(): Promise<{
  status: string;
  uptime: number;
  memoryUsageMB: number;
  pipelineMetrics: Awaited<ReturnType<typeof getPipelineMetrics>>;
}> {
  const mem = process.memoryUsage();
  return {
    status: 'healthy',
    uptime: process.uptime(),
    memoryUsageMB: Math.round(mem.heapUsed / 1024 / 1024),
    pipelineMetrics: await getPipelineMetrics('system', 24),
  };
}

export async function getSecurityEvents(hours: number): Promise<Array<{
  type: string;
  userId?: string;
  ip?: string;
  detail: string;
  severity: string;
  createdAt: string;
}>> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: ['SECURITY_LOGIN_FAILURE', 'SECURITY_UNAUTHORIZED', 'SECURITY_RATE_LIMIT', 'SECURITY_INJECTION_ATTEMPT'] },
      createdAt: { gte: since },
    },
    select: { action: true, metadata: true, userId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  return logs.map((l: { action: string; metadata: unknown; userId: string | null; createdAt: Date }) => {
    const meta = l.metadata ? l.metadata as Record<string, string> : {};
    return {
      type: l.action.replace('SECURITY_', ''),
      userId: l.userId ?? undefined,
      ip: meta.ip,
      detail: meta.detail ?? JSON.stringify(l.metadata) ?? '',
      severity: meta.severity ?? 'medium',
      createdAt: l.createdAt.toISOString(),
    };
  });
}

export function startMetricFlush(intervalMs = 30000): void {
  if (flushInterval) return;
  flushInterval = setInterval(() => {
    void flushMetrics();
  }, intervalMs);
}

export function stopMetricFlush(): void {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
  void flushMetrics();
}
