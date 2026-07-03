/// <reference types="vite/client" />
// SEWA XAI — frontend/src/services/apiClient.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const isProd = typeof window !== 'undefined' && 
  (window.location.hostname.includes('sewaxai.health') || window.location.hostname.includes('azurestaticapps.net'));
const BASE = isProd 
  ? 'https://api.sewaxai.health/api/v1' 
  : (import.meta.env.VITE_API_URL ?? '/api/v1');


export const apiClient = axios.create({ baseURL: BASE, timeout: 30_000 });

apiClient.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;

  // ── Multi-tenancy: Inject X-Tenant-ID from subdomain ────────
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const parts = host.split('.');
    // If tenant.domain.com, parts.length >= 3
    if (parts.length >= 3 && !host.includes('azurestaticapps.net')) {
      cfg.headers['X-Tenant-ID'] = parts[0];
    } else {
      // Fallback: check localStorage or auth store if subdomain not present
      const tenant = (window as any)._tenantSlug || 'royal-london';
      cfg.headers['X-Tenant-ID'] = tenant;
    }
  }

  return cfg;
});

apiClient.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        await useAuthStore.getState().refreshAuth();
        const newToken = useAuthStore.getState().token;
        if (!newToken) {
          // Refresh cleared auth — force logout state (already handled in refreshAuth)
          return Promise.reject(err);
        }
        err.config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(err.config);
      } catch {
        // Refresh failed — logout and reject original request
        await useAuthStore.getState().logout();
        return Promise.reject(err);
      }
    }
  return Promise.reject(err);
  }
);

/**
 * Open report download in new tab
 * @param reportId - ID of the report to download
 */
export function downloadReport(reportId: string): void {
  const token = useAuthStore.getState().token;
  const url = `${BASE}/reports/${reportId}/download`;
  // For redirects, we need to handle auth via query param temporarily, or open a popup with auth header
  // For simplicity, we'll use window.open and rely on the API's redirect
  window.open(url, '_blank');
}

export async function getFeedback(params?: { status?: string; category?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.category) searchParams.set('category', params.category);
  const res = await apiClient.get(`/feedback?${searchParams.toString()}`);
  return res.data;
}

export async function getFeedbackById(id: string) {
  const res = await apiClient.get(`/feedback/${id}`);
  return res.data;
}

export async function createFeedback(data: {
  feedbackType: string;
  score?: number;
  subject?: string;
  description: string;
  category?: string;
  metadata?: any;
}) {
  const res = await apiClient.post('/feedback', data);
  return res.data;
}

export async function updateFeedback(id: string, data: { status?: string; prioritized?: boolean }) {
  const res = await apiClient.patch(`/feedback/${id}`, data);
  return res.data;
}

// Second Opinion API
export async function getSpecialists() {
  const res = await apiClient.get('/second-opinions/specialists');
  return res.data;
}

export async function getAllSecondOpinions() {
  const res = await apiClient.get('/second-opinions');
  return res.data;
}

export async function getPendingSecondOpinions() {
  const res = await apiClient.get('/second-opinions/pending');
  return res.data;
}

export async function createSecondOpinion(data: { 
  scanId: string; 
  reportId?: string; 
  assignedToId?: string; 
  notes?: string;
  priority?: 'STAT'|'URGENT'|'ROUTINE';
  reason?: string;
}) {
  const res = await apiClient.post('/second-opinions', data);
  return res.data;
}

export async function updateSecondOpinion(id: string, data: { 
  status?: string; 
  reviewNotes?: string;
  agreedWithAI?: boolean;
}) {
  const res = await apiClient.patch(`/second-opinions/${id}`, data);
  return res.data;
}

