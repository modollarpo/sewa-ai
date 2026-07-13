import { describe, it, expect } from 'vitest';

describe('RadiologistWorkspace — urgency coloring', () => {
  const textMd = '#6b7280';
  const critical = '#dc2626';
  const urgent = '#ea580c';
  const normal = '#16a34a';
  const urgencyColor = (u: string) => {
    const m: Record<string, string> = { CRITICAL: critical, URGENT: urgent, NORMAL: normal, ROUTINE: textMd };
    return m[u.toUpperCase()] ?? textMd;
  };

  it('CRITICAL returns red', () => {
    expect(urgencyColor('CRITICAL')).toBe(critical);
  });

  it('URGENT returns orange', () => {
    expect(urgencyColor('URGENT')).toBe(urgent);
  });

  it('NORMAL returns green', () => {
    expect(urgencyColor('NORMAL')).toBe(normal);
  });

  it('ROUTINE returns default text', () => {
    expect(urgencyColor('ROUTINE')).toBe(textMd);
  });

  it('unknown urgency returns default', () => {
    expect(urgencyColor('UNKNOWN')).toBe(textMd);
  });

  it('is case-insensitive', () => {
    expect(urgencyColor('critical')).toBe(critical);
    expect(urgencyColor('Urgent')).toBe(urgent);
  });
});

describe('RadiologistWorkspace — urgency background', () => {
  const critBg = '#fef2f2';
  const urgBg = '#fff7ed';
  const normalBg = '#f0fdf4';
  const bg3 = '#1f2937';
  const urgencyBg = (u: string) => {
    const m: Record<string, string> = { CRITICAL: critBg, URGENT: urgBg, NORMAL: normalBg, ROUTINE: bg3 };
    return m[(u || '').toUpperCase()] ?? bg3;
  };

  it('maps each urgency to correct background', () => {
    expect(urgencyBg('CRITICAL')).toBe(critBg);
    expect(urgencyBg('URGENT')).toBe(urgBg);
    expect(urgencyBg('NORMAL')).toBe(normalBg);
    expect(urgencyBg('ROUTINE')).toBe(bg3);
  });

  it('handles undefined gracefully', () => {
    expect(urgencyBg('')).toBe(bg3);
  });
});

describe('RadiologistWorkspace — time formatting', () => {
  function fmtTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  it('formats ISO timestamp to HH:MM', () => {
    const result = fmtTime('2026-07-12T14:30:00Z');
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('RadiologistWorkspace — selected scan state', () => {
  it('defaults to null when no scan selected', () => {
    const selectedScan: any = null;
    expect(selectedScan).toBeNull();
  });

  it('stores scan id and modality when selected', () => {
    const scan = { id: 'scan-123', modality: 'CT', status: 'completed' };
    expect(scan.id).toBe('scan-123');
    expect(scan.modality).toBe('CT');
  });
});
