// SEWA AI — StatusBadge.tsx
// Urgency, status, and state badges used across dashboards.
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import React from 'react';

type UrgencyLevel = 'CRITICAL' | 'URGENT' | 'NORMAL' | 'ROUTINE';
type StatusType = 'active' | 'trial' | 'past_due' | 'cancelled' | 'suspended' | 'pending' | 'succeeded' | 'failed' | 'approved' | 'draft' | 'processing' | 'healthy' | 'degraded' | 'down';

const URGENCY_STYLES: Record<UrgencyLevel, { bg: string; color: string; border: string; label: string }> = {
  CRITICAL: { bg: 'rgba(224,53,53,0.12)',  color: '#FF8080',  border: 'rgba(224,53,53,0.4)',  label: '⚡ CRITICAL' },
  URGENT:   { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B',  border: 'rgba(245,158,11,0.4)', label: '⚠ URGENT'   },
  NORMAL:   { bg: 'rgba(29,191,115,0.10)', color: '#1DBF73',  border: 'rgba(29,191,115,0.3)', label: '✓ NORMAL'   },
  ROUTINE:  { bg: 'rgba(64,141,123,0.10)', color: '#52B09A',  border: 'rgba(64,141,123,0.3)', label: 'ROUTINE'    },
};

const STATUS_STYLES: Record<StatusType, { bg: string; color: string }> = {
  active:     { bg: 'rgba(29,191,115,0.10)', color: '#1DBF73' },
  healthy:    { bg: 'rgba(29,191,115,0.10)', color: '#1DBF73' },
  succeeded:  { bg: 'rgba(29,191,115,0.10)', color: '#1DBF73' },
  approved:   { bg: 'rgba(29,191,115,0.10)', color: '#1DBF73' },
  trial:      { bg: 'rgba(64,141,123,0.12)', color: '#52B09A' },
  pending:    { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  processing: { bg: 'rgba(42,110,242,0.12)', color: '#2A6EF2' },
  draft:      { bg: 'rgba(100,116,139,0.12)',color: '#94a3b8' },
  degraded:   { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  past_due:   { bg: 'rgba(224,53,53,0.10)',  color: '#FF8080' },
  cancelled:  { bg: 'rgba(100,116,139,0.10)',color: '#94a3b8' },
  suspended:  { bg: 'rgba(224,53,53,0.10)',  color: '#FF8080' },
  failed:     { bg: 'rgba(224,53,53,0.10)',  color: '#FF8080' },
  down:       { bg: 'rgba(224,53,53,0.10)',  color: '#FF8080' },
};

export function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  const s = URGENCY_STYLES[level] || URGENCY_STYLES.NORMAL;
  return (
    <span style={{ padding:'3px 10px', borderRadius:12, background:s.bg, color:s.color, border:`1px solid ${s.border}`, fontSize:11, fontWeight:800, fontFamily:"'IBM Plex Sans',system-ui,sans-serif", letterSpacing:'0.04em', whiteSpace:'nowrap' }}>
      {s.label}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: StatusType; label?: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{ padding:'3px 10px', borderRadius:12, background:s.bg, color:s.color, fontSize:11, fontWeight:700, fontFamily:"'IBM Plex Sans',system-ui,sans-serif", letterSpacing:'0.04em', textTransform:'capitalize', whiteSpace:'nowrap' }}>
      {label || status.replace('_', ' ')}
    </span>
  );
}
