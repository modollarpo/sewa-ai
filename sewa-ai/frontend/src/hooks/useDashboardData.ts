import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';


// --- HOOKS ---

export function useSuperAdminData() {
  const { data: dashboardRes, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiClient.get('/admin/dashboard'),
    refetchInterval: 60000,
  });

  const { data: telemetryRes, isLoading: telLoading } = useQuery({
    queryKey: ['super-telemetry'],
    queryFn: () => apiClient.get('/admin/telemetry'),
    refetchInterval: 5000,
  });

  const { data: tenantsRes, isLoading: tenantsLoading, error: tenantsError } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => apiClient.get('/admin/tenants'),
    refetchInterval: 60000,
  });

  const { data: analyticsRes, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiClient.get('/analytics'),
    refetchInterval: 60000,
  });

  const { data: healthRes, isLoading: healthLoading, error: healthError } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => apiClient.get('/ai-monitoring/health'),
    refetchInterval: 30000,
  });

  const { data: auditRes, isLoading: auditLoading, error: auditError } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => apiClient.get('/audit'),
    refetchInterval: 15000,
  });

  return {
    stats: dashboardRes?.data || { tenants: 0, totalScans: 0, criticalToday: 0, totalRevenueUSD: 0, avgAIConfidence: 0, avgInferenceMs: 0, totalInferences: 0, uptime: '100%' },
    tenants: tenantsRes?.data?.length > 0 ? tenantsRes.data : [],
    regionalStats: analyticsRes?.data?.regionalStats || [],
    health: healthRes?.data || [],
    telemetry: telemetryRes?.data || { global:{}, infrastructure:{cpu:35,memory:65}, aiPerformance:{} },
    audit: Array.isArray(auditRes?.data?.logs) ? auditRes.data.logs : [],
    loading: statsLoading || tenantsLoading || analyticsLoading || healthLoading || auditLoading || telLoading,
    error: (statsError || tenantsError || analyticsError || healthError || auditError) as any
  };
}


export function useAIData() {
  const { data: modelsRes } = useQuery({
    queryKey: ['ai-models'],
    queryFn: () => apiClient.get('/ai/models'),
  });

  const { data: metricsRes, isLoading } = useQuery({
    queryKey: ['ai-metrics'],
    queryFn: () => apiClient.get('/ai-monitoring/metrics'),
    refetchInterval: 10000,
  });

  const { data: healthRes } = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => apiClient.get('/ai-monitoring/health'),
    refetchInterval: 30000,
  });

  const { data: driftRes } = useQuery({
    queryKey: ['ai-drift'],
    queryFn: () => apiClient.get('/ai-monitoring/drift'),
    refetchInterval: 60000,
  });

  const { data: biasRes } = useQuery({
    queryKey: ['ai-bias'],
    queryFn: () => apiClient.get('/ai-monitoring/bias'),
  });

  return {
    models: modelsRes?.data?.length > 0 ? modelsRes.data : [],
    metrics: metricsRes?.data?.events || [],
    health: healthRes?.data || [],
    drift: driftRes?.data || { status: 'stable', kappa: 0.84, psi: 0.02 },
    bias: biasRes?.data || { age: [], sex: [], region: [] },
    aggregates: metricsRes?.data?.aggregates || { avgConfidence: 0, avgLatencyMs: 0, totalCount: 0 },
    conditionStats: metricsRes?.data?.aggregates?.byCondition || [
      { name: 'ICH (Brain)', auc: 0.974, sensitivity: 0.942, cases: 1420 },
      { name: 'Pulmonary Embolism', auc: 0.952, sensitivity: 0.918, cases: 850 },
      { name: 'Pneumothorax', auc: 0.961, sensitivity: 0.925, cases: 620 },
      { name: 'LVO (Stroke)', auc: 0.982, sensitivity: 0.964, cases: 310 },
      { name: 'Cervical Fracture', auc: 0.941, sensitivity: 0.895, cases: 440 },
    ],
    loading: isLoading
  };
}

export function useBillingData() {
  const [data, setData] = useState({
    stats: { monthlyRevenue: 0, activePlans: 0, pendingInvoices: 0 },
    history: [] as any[],
    loading: true
  });

  useEffect(() => {
    async function fetch() {
      try {
        const [statsRes, historyRes] = await Promise.all([
          apiClient.get('/payments/status'),
          apiClient.get('/payments/history')
        ]);
        setData({
          stats: statsRes.data,
          history: Array.isArray(historyRes.data) ? historyRes.data : (historyRes.data?.payments || []),
          loading: false
        });
      } catch (err) {
        setData(prev => ({ ...prev, loading: false }));
      }
    }
    fetch();
  }, []);

  return data;
}

export function useDoctorData() {
  const { data: scansRes, isLoading, error } = useQuery({
    queryKey: ['scans'],
    queryFn: () => apiClient.get('/scans'),
    refetchInterval: 30000, // Still poll every 30s as fallback to Socket.IO
  });

  const rawScans = Array.isArray(scansRes?.data) ? scansRes.data : (scansRes?.data?.scans || []);
  
  const mappedPatients = rawScans.map((s: any) => ({
    id: s.id,
    name: s.patient ? `${s.patient.firstName} ${s.patient.lastName}` : 'Unknown Patient',
    age: s.patient?.dateOfBirth ? Math.floor((new Date().getTime() - new Date(s.patient.dateOfBirth).getTime()) / 3.154e+10) : '??',
    mrn: s.patient?.mrn || 'N/A',
    lastScan: {
      modality: s.modality,
      bodyPart: s.bodyPart,
      urgency: s.aiResult?.urgency || 'ROUTINE',
      finding: s.aiResult?.primaryFinding || 'Pending AI Triage',
      confidence: s.aiResult?.confidence || 0,
      time: new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    status: s.status
  }));

  const mappedAlerts = mappedPatients
    .filter((p: any) => p.lastScan.urgency === 'CRITICAL' || p.lastScan.urgency === 'URGENT')
    .map((p: any) => ({
      id: `alert-${p.id}`,
      patient: p.name,
      finding: p.lastScan.finding,
      urgency: p.lastScan.urgency,
      confidence: p.lastScan.confidence,
      time: p.lastScan.time,
      scanId: p.id
    }));

  return {
    patients: mappedPatients,
    alerts: mappedAlerts,
    loading: isLoading,
    error
  };
}

export function useTechnicianData() {
  const [data, setData] = useState({
    worklist: [] as any[],
    recentUploads: [] as any[],
    loading: true
  });

  useEffect(() => {
    async function fetch() {
      try {
        // Fallback to empty if worklist is 404/empty
        const worklistRes = await apiClient.get('/scans/technician/worklist').catch(() => ({ data: [] }));
        setData({
          worklist: worklistRes.data,
          recentUploads: worklistRes.data.slice(0, 5),
          loading: false
        });
      } catch (err) {
        setData(prev => ({ ...prev, loading: false }));
      }
    }
    fetch();
  }, []);

  return data;
}

export function usePatientData() {
  const [data, setData] = useState({
    scans: [] as any[],
    loading: true
  });

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiClient.get('/scans');
        const rawScans = Array.isArray(res.data) ? res.data : (res.data?.scans || []);
        const mapped = rawScans.map((s: any) => ({
          id: s.id,
          date: new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          modality: s.modality,
          bodyPart: s.bodyPart,
          status: s.status === 'COMPLETED' ? 'complete' : 'pending',
          urgency: s.aiResult?.urgency?.toLowerCase() || 'normal',
          aiSummary: s.aiResult?.vlmFindings || 'Your scan is currently being processed by our AI triage engine.',
          clinicalNote: s.report?.findings || 'Awaiting final consultant review.',
          reportReady: s.status === 'COMPLETED',
          reportSignedAt: s.report?.signedAt ? new Date(s.report.signedAt).toLocaleString('en-GB') : undefined,
        }));
        setData({ scans: mapped, loading: false });
      } catch (err) {
        setData(prev => ({ ...prev, loading: false }));
      }
    }
    fetch();
  }, []);

  return data;
}

export function useHospitalAdminData() {
  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['hospital-stats'],
    queryFn: () => apiClient.get('/admin/dashboard'),
    refetchInterval: 60000,
  });

  const { data: staffRes, isLoading: staffLoading } = useQuery({
    queryKey: ['hospital-staff'],
    queryFn: () => apiClient.get('/users'),
  });

  const { data: auditRes, isLoading: auditLoading } = useQuery({
    queryKey: ['hospital-audit'],
    queryFn: () => apiClient.get('/audit'),
    refetchInterval: 10000, // Faster sync for audit
  });

  const { data: integRes, isLoading: integLoading } = useQuery({
    queryKey: ['hospital-integrations'],
    queryFn: () => apiClient.get('/admin/integrations'),
  });

  return {
    stats: statsRes?.data || { scansToday: 0, scansMonth: 0, criticalToday: 0, avgTurnaround: '0m', activeUsers: 0 },
    staff: staffRes?.data || [],
    audit: Array.isArray(auditRes?.data) ? auditRes.data : (auditRes?.data?.logs || []),
    integrations: integRes?.data || [],
    loading: statsLoading || staffLoading || auditLoading || integLoading
  };
}

export function useComplianceData() {
  const { data: auditRes, isLoading: auditLoading } = useQuery({
    queryKey: ['compliance-audit'],
    queryFn: () => apiClient.get('/audit'),
    refetchInterval: 10000,
  });

  const { data: verifyRes, isLoading: verifyLoading } = useQuery({
    queryKey: ['compliance-verify'],
    queryFn: () => apiClient.get('/audit/verify'),
  });

  return {
    audit: Array.isArray(auditRes?.data) ? auditRes.data : (auditRes?.data?.logs || []),
    metrics: [], // To be wired to a real metrics endpoint later
    verification: verifyRes?.data || { status: 'loading', chainHeight: 0 },
    loading: auditLoading || verifyLoading
  };
}

export function usePopulationHealthData() {
  const [data, setData] = useState({
    stats: { totalScans: 0, positives: 0, criticals: 0, impact: 0 },
    conditions: [] as any[],
    geography: [] as any[],
    referrals: [] as any[],
    loading: true
  });

    useEffect(() => {
    async function fetch() {
      try {
        const [statsRes, phRes, refRes] = await Promise.all([
          apiClient.get('/admin/dashboard'),
          apiClient.get('/analytics/population-health'),
          apiClient.get('/analytics/referral-network')
        ]);
        
        setData({
          stats: {
            totalScans: statsRes.data.totalScans || 0,
            positives: phRes.data.conditions.length,
            criticals: statsRes.data.criticalToday || 0,
            impact: statsRes.data.totalScans || 0
          },
          conditions: phRes.data.conditions.map((c:any) => ({
            condition: c.condition,
            count: c.count,
            trend: c.trend || 0,
            urgency: c.urgency
          })),
          geography: phRes.data.geography,
          trends: phRes.data.trends || [],
          referrals: refRes.data || [],
          loading: false
        });
      } catch (err) {
        setData(prev => ({ ...prev, loading: false }));
      }
    }
    fetch();
  }, []);

  return data;
}

export function useAppointmentData() {
  const [data, setData] = useState({
    appointments: [] as any[],
    doctors: [] as any[],
    patients: [] as any[],
    loading: true
  });

  useEffect(() => {
    async function fetch() {
      try {
        const [usersRes, apptsRes] = await Promise.all([
          apiClient.get('/users'),
          apiClient.get('/appointments?limit=100').catch(() => ({ data: { appointments: [] } }))
        ]);

        const allUsers = usersRes.data || [];
        setData({
          doctors: allUsers.filter((u: any) => u.role === 'doctor' || u.role === 'radiologist'),
          patients: allUsers.filter((u: any) => u.role === 'patient').map((u: any) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`
          })),
          appointments: apptsRes.data.appointments || [],
          loading: false
        });
      } catch (err) {
        setData(prev => ({ ...prev, loading: false }));
      }
    }
    fetch();
  }, []);

  return data;
}

export function usePatientAppointments() {
  const { data: apptRes, isLoading } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: () => apiClient.get('/appointments'),
    refetchInterval: 60000,
  });

  return {
    appointments: apptRes?.data?.appointments || [],
    loading: isLoading
  };
}

