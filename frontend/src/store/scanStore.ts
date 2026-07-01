// SEWA XAI — frontend/src/store/scanStore.ts
import { create } from 'zustand';
import { apiClient } from '../services/apiClient';

interface AIResult { primaryFinding:string; urgency:string; confidence:number; gradcamUrl?:string; }
interface Scan { id:string; modality:string; bodyPart:string; priority:string; status:string; receivedAt:string; aiResult?:AIResult; patient?:any; report?:any; }

interface ScanStore {
  scans: Scan[];
  criticalAlerts: Scan[];
  selectedScan: Scan | null;
  isLoading: boolean;
  total: number;
  fetchWorklist(params?: Record<string,string>): Promise<void>;
  selectScan(id: string): Promise<void>;
  handleAIResult(data: { scanId:string; urgency:string; primaryFinding:string; confidence:number; }): void;
  updateScanStatus(scanId: string, status: string): void;
  acknowledgeAlert(scanId: string): void;
}

export const useScanStore = create<ScanStore>((set, get) => ({
  scans: [], criticalAlerts: [], selectedScan: null, isLoading: false, total: 0,

  fetchWorklist: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await apiClient.get('/scans', { params: { limit: 50, ...params } });
      const scans = data.scans;
      set({ scans, total: data.total, isLoading: false,
            criticalAlerts: scans.filter((s: Scan) => s.aiResult?.urgency === 'CRITICAL') });
    } catch { set({ isLoading: false }); }
  },

  selectScan: async (id) => {
    const { data } = await apiClient.get(`/scans/${id}`);
    set({ selectedScan: data });
  },

  handleAIResult: ({ scanId, urgency, primaryFinding, confidence }) => {
    set(s => ({
      scans: s.scans.map(scan =>
        scan.id === scanId ? { ...scan, status:'ai_complete', aiResult:{ primaryFinding, urgency, confidence } } : scan
      ),
      criticalAlerts: urgency === 'CRITICAL'
        ? [...s.criticalAlerts, { ...s.scans.find(s=>s.id===scanId)!, aiResult:{ primaryFinding, urgency, confidence } }].filter(Boolean)
        : s.criticalAlerts,
    }));
  },

  updateScanStatus: (scanId, status) => {
    set(s => ({ scans: s.scans.map(scan => scan.id === scanId ? { ...scan, status } : scan) }));
  },
  acknowledgeAlert: (scanId) => {
    set(s => ({ criticalAlerts: s.criticalAlerts.filter(a => a.id !== scanId) }));
  },
}));
