import { prisma }              from '../../config/database';
import { notifyUsers } from '../notifications/notificationService';
import { sendEmail } from '../emailService';
import { auditLog } from '../../utils/audit';
import { logger }              from '../../utils/logger';

export type ReferralPriority = 'STAT' | 'URGENT' | 'ROUTINE';

export type ReferralRequest = {
  scanId:           string;
  requestingUserId: string;
  tenantId:         string;
  speciality:       string;       // 'neuroradiology', 'cardiothoracic', etc.
  reason:           string;
  aiSummary:        string;
  priority:         ReferralPriority;
  allowCrossBorder: boolean;      // Consent for international referral
};

export type ReferralMatch = {
  specialistId:  string;
  specialistName:string;
  speciality:    string;
  hospital:      string;
  region:        string;
  expertiseScore:number;          // 0-1 computed from past case accuracy
  avgResponseHrs:number;
  isAvailable:   boolean;
  isTelemedicine:boolean;
  distance?:     string;          // e.g. 'Lagos → London (telemedicine)'
};

// Speciality routing map — which specialities handle which conditions
const CONDITION_SPECIALITY_MAP: Record<string, string[]> = {
  'ICH':                  ['neuroradiology', 'neurosurgery', 'neurology'],
  'LVO':                  ['neuroradiology', 'interventional_neuroradiology'],
  'Pulmonary Embolism':   ['cardiothoracic', 'radiology', 'pulmonology'],
  'TB':                   ['radiology', 'infectious_disease', 'pulmonology'],
  'Pneumonia':            ['radiology', 'pulmonology'],
  'Pneumothorax':         ['cardiothoracic', 'emergency_medicine'],
  'Fracture':             ['musculoskeletal_radiology', 'orthopaedics'],
};

class ReferralNetworkService {

  /** Find best-matched specialists for a case */
  async findSpecialists(request: ReferralRequest, aiResult: { primaryFinding: string }): Promise<ReferralMatch[]> {
    const preferredSpecialities = CONDITION_SPECIALITY_MAP[aiResult.primaryFinding] ??
      [request.speciality];

    // Find specialists in network — same tenant first, then cross-tenant (Africa priority)
    const specialists = await prisma.user.findMany({
      where: {
        role:      'radiologist',
        status:    'active',
        speciality:{ in: preferredSpecialities },
        ...(request.allowCrossBorder ? {} : { tenantId: request.tenantId }),
      },
      include: { tenant: true },
      take: 10,
    });

    // ── Compute real expertise scores from clinical history ────
    const specialistIds = specialists.map((s: { id: string }) => s.id);

    // Fetch completed second opinions for these specialists
    const completedOpinions = await prisma.secondOpinion.findMany({
      where: { assignedToId: { in: specialistIds }, status: 'completed' },
      select: { assignedToId: true, createdAt: true, updatedAt: true, scanId: true },
    });

    // Compute per-specialist metrics
    const specialistMetrics: Record<string, { completedCount: number; avgResponseMs: number }> = {};
    for (const op of completedOpinions) {
      const id = op.assignedToId;
      if (!id) continue;
      if (!specialistMetrics[id]) specialistMetrics[id] = { completedCount: 0, avgResponseMs: 0 };
      specialistMetrics[id].completedCount++;
      specialistMetrics[id].avgResponseMs += (op.updatedAt.getTime() - op.createdAt.getTime());
    }
    // Finalise averages
    for (const id of Object.keys(specialistMetrics)) {
      const m = specialistMetrics[id];
      if (m.completedCount > 0) m.avgResponseMs = m.avgResponseMs / m.completedCount;
    }

    const matches: ReferralMatch[] = specialists.map((s: any): ReferralMatch => {
      const metrics      = specialistMetrics[s.id];
      const caseVolume   = metrics?.completedCount ?? 0;
      const avgResponseMs= metrics?.avgResponseMs  ?? 6 * 3_600_000; // default 6h

      // Expertise score: blended from case volume (normalised) + response rate
      // 0.5 base + up to 0.4 from volume (capped at 50 cases) + up to 0.1 from speed
      const volumeScore  = Math.min(caseVolume / 50, 1) * 0.4;
      const speedScore   = Math.max(0, 1 - avgResponseMs / (24 * 3_600_000)) * 0.1;
      const expertiseScore = Math.min(0.5 + volumeScore + speedScore, 1.0);
      const avgResponseHrs = Math.round(avgResponseMs / 3_600_000) || 6;

      return {
        specialistId:   s.id,
        specialistName: `Dr ${s.firstName} ${s.lastName}`,
        speciality:     s.speciality ?? request.speciality,
        hospital:       s.tenant?.name ?? '',
        region:         s.tenant?.region ?? '',
        expertiseScore,
        avgResponseHrs,
        isAvailable:    true,
        isTelemedicine: s.tenantId !== request.tenantId,
        distance:       s.tenantId !== request.tenantId
          ? `${s.tenant?.region ?? ''} → Telemedicine` : 'Same hospital',
      };
    });

    // Sort: same-hospital first, then by expertise score
    return matches.sort((a, b) => {
      if (!a.isTelemedicine && b.isTelemedicine) return -1;
      if (a.isTelemedicine && !b.isTelemedicine) return  1;
      return b.expertiseScore - a.expertiseScore;
    });
  }

  /** Create and dispatch a referral */
  async createReferral(request: ReferralRequest, specialistId: string, _aiResult: unknown): Promise<unknown> {
    // Create referral record (uses secondOpinion table in current schema)
    const referral = await prisma.secondOpinion.create({
      data: {
        scanId:          request.scanId,
        requesterId:     request.requestingUserId,
        assignedToId:    specialistId,
        status:          'pending',
        reason:          request.reason,
        priority:        request.priority,
      },
    });

    // Notify specialist
    await notifyUsers({
      tenantId: request.tenantId,
      userIds: [specialistId],
      type:    'new_referral',
      title:   `New ${request.priority} Referral — ${request.speciality}`,
      body:    `${request.reason}. ${request.aiSummary}`,
      data:    { referralId: referral.id, scanId: request.scanId, priority: request.priority },
    });

    // SLA tracking
    const slaHours = { STAT: 1, URGENT: 4, ROUTINE: 24 }[request.priority];
    const deadline  = new Date(Date.now() + slaHours * 3_600_000);

    await auditLog({
      tenantId:     request.tenantId,
      action:       'REFERRAL_CREATED',
      entity:       'SecondOpinion',
      entityId:     referral.id,
      userId:       request.requestingUserId,
      metadata:     { specialistId, priority: request.priority, slaDeadline: deadline.toISOString() },
    });

    logger.info(`Referral created: ${referral.id} → specialist ${specialistId} (${request.priority})`);

    return { referral, slaDeadline: deadline.toISOString(), specialist: specialistId };
  }
}

export const referralNetworkService = new ReferralNetworkService();

// ── SLA Escalation Cron — run every 30 minutes ────────────────
// Checks for referrals that have breached their SLA deadline
// and escalates via notification + audit log.
// Wire in index.ts: setInterval(escalateOverdueReferrals, 30 * 60 * 1000)

export async function escalateOverdueReferrals(): Promise<void> {
  const now = new Date();

  // Find pending/assigned second opinions whose SLA deadline has passed
  // SLA stored in metadata.slaDeadline (set at creation)
  const overdueReferrals = await prisma.secondOpinion.findMany({
    where: {
      status:    { in: ['pending', 'assigned'] },
      updatedAt: { lt: new Date(now.getTime() - 60 * 60 * 1000) }, // updated > 1h ago
    },
    include: {
      scan:      { select: { tenantId: true, priority: true } },
      requester: { select: { id: true, tenantId: true } },
    },
    take: 50, // batch limit
  });

  let escalated = 0;

  for (const referral of overdueReferrals) {
    // Determine SLA hours from priority
    const priority  = referral.priority as string;
    const slaHours  = priority === 'STAT' ? 1 : priority === 'URGENT' ? 4 : 24;
    const createdAt = referral.createdAt;
    const deadline  = new Date(createdAt.getTime() + slaHours * 3_600_000);

    if (now < deadline) continue; // SLA not yet breached

    // Already escalated within this window? Check audit log
    const recentEscalation = await prisma.auditLog.findFirst({
      where: {
        entityId:   referral.id,
        action:     'REFERRAL_SLA_ESCALATED',
        createdAt:  { gt: new Date(now.getTime() - 30 * 60 * 1000) }, // in last 30 min
      },
    });
    if (recentEscalation) continue;

    // Escalate: notify requesting clinician and tenant admins
    const tenantId = referral.scan?.tenantId ?? referral.requester?.tenantId;
    if (!tenantId) continue;

    const breachMins = Math.round((now.getTime() - deadline.getTime()) / 60_000);

    await notifyUsers({
      tenantId,
      userIds: [referral.requesterId],
      type:    'referral_sla_breach',
      title:   `⚠️ Referral SLA Breached — ${priority}`,
      body:    `Referral ${referral.id} breached SLA by ${breachMins} minutes. Specialist has not responded.`,
      data:    { referralId: referral.id, scanId: referral.scanId, breachMinutes: String(breachMins), priority },
    }).catch(() => {});

    // Also notify admins in the tenant
    const admins = await prisma.user.findMany({
      where: { tenantId, role: { in: ['admin', 'superadmin'] }, status: 'active' },
      select: { id: true },
      take: 5,
    });
    if (admins.length > 0) {
      await notifyUsers({
        tenantId,
        userIds: admins.map((a: { id: string }) => a.id),
        type:    'referral_sla_breach',
        title:   `⚠️ ${priority} Referral SLA Missed`,
        body:    `Referral ${referral.id} missed its ${slaHours}h SLA by ${breachMins} minutes. Manual review needed.`,
        data:    { referralId: referral.id, scanId: referral.scanId, breachMinutes: String(breachMins) },
      }).catch(() => {});
    }

    await auditLog({
      tenantId,
      action:       'REFERRAL_SLA_ESCALATED',
      entity:       'SecondOpinion',
      entityId:     referral.id,
      metadata:     { priority, slaHours, breachMinutes: breachMins, deadline: deadline.toISOString() },
    });

    escalated++;
  }

  if (escalated > 0) {
    logger.warn(`[ReferralSLA] Escalated ${escalated} overdue referral(s)`);
  }
}
