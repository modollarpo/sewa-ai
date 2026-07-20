// SEWA XAI — PopulationHealthDashboard.tsx
// Real-time epidemiological surveillance powered by live AI scan data
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';

import { dashboardColors as C } from '../../design-system/tokens';
import { ConfidenceIndicator } from '../../design-system/components';

const DISEASE_COLORS: Record<string, string> = {
  'Tuberculosis': '#E08A20',
  'Pneumonia':    '#2A6EF2',
  'ICH':          '#E03535',
  'Stroke':       '#8B5CF6',
};

const REGION_COORDS: Record<string, { x: number; y: number; label: string; flag: string }> = {
  UK: { x: 46, y: 20, label: 'United Kingdom', flag: '🇬🇧' },
  NG: { x: 49, y: 50, label: 'Nigeria', flag: '🇳🇬' },
  KE: { x: 55, y: 56, label: 'Kenya', flag: '🇰🇪' },
  ZA: { x: 52, y: 70, label: 'South Africa', flag: '🇿🇦' },
  GH: { x: 47, y: 52, label: 'Ghana', flag: '🇬🇭' },
  US: { x: 18, y: 32, label: 'United States', flag: '🇺🇸' },
};

export function PopulationHealthDashboard() {
  const [tab, setTab] = useState<'anomalies'|'heatmap'|'events'>('anomalies');
  const [heatmaps, setHeatmaps] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const r = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [heatRes, anomRes, evtRes] = await Promise.all([
        apiClient.get(`/ai/epi/heatmaps?days=${days}`),
        apiClient.get('/ai/epi/anomalies'),
        apiClient.get('/ai/epi/events'),
      ]);
      setHeatmaps(heatRes.data || []);
      setAnomalies(anomRes.data || []);
      setEvents(evtRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load surveillance data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '8px 14px', fontSize: 12, fontWeight: tab === t ? 600 : 400,
    color: tab === t ? C.brand : C.textLo, background: 'none', border: 'none',
    borderBottom: `2px solid ${tab === t ? C.brand : 'transparent'}`,
    marginBottom: '-1px', cursor: 'pointer', fontFamily: C.F, whiteSpace: 'nowrap',
  });

  // Aggregate by region for map
  const byRegion: Record<string, { total: number; diseases: Record<string, number> }> = {};
  heatmaps.forEach((h: any) => {
    if (!byRegion[h.region]) byRegion[h.region] = { total: 0, diseases: {} };
    byRegion[h.region].total += h._count.id;
    byRegion[h.region].diseases[h.disease] = (byRegion[h.region].diseases[h.disease] || 0) + h._count.id;
  });

  // Top disease per region
  const maxCases = Math.max(...Object.values(byRegion).map(r => r.total), 1);

  return (
    <div style={{ padding: isMobile ? 16 : 24, background: C.bg1, minHeight: 'calc(100vh - 76px)', fontFamily: C.F }}>
      
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${C.urgent}14`, color: C.urgent, border: `1px solid ${C.urgent}30`, letterSpacing: '0.06em' }}>
              🌍 EPIDEMIOLOGY
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textHi }}>Population Health Surveillance</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMd }}>
            Real-time, anonymised disease signals aggregated from SEWA AI scan analysis
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 11, color: C.textLo }}>Range:</label>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: days === d ? 700 : 400,
              background: days === d ? `${C.brand}22` : 'transparent', color: days === d ? C.brand : C.textLo,
              border: `1px solid ${days === d ? `${C.brand}50` : C.border}`, cursor: 'pointer'
            }}>{d}d</button>
          ))}
          <button onClick={fetchData} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, background: C.brand, color: 'white', border: 'none', cursor: 'pointer' }}>↻ Refresh</button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Events', value: heatmaps.reduce((a, h) => a + h._count.id, 0).toLocaleString(), icon: '🔬', color: C.brand },
          { label: 'Outbreak Alerts', value: anomalies.length, icon: '⚠️', color: anomalies.length > 0 ? C.critical : C.normal },
          { label: 'Regions Monitored', value: Object.keys(byRegion).length, icon: '🌍', color: C.info },
          { label: 'Diseases Tracked', value: new Set(heatmaps.map((h: any) => h.disease)).size, icon: '🧬', color: C.urgent },
        ].map(s => (
          <div key={s.label} style={{ padding: 16, background: C.bg2, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: C.textMd, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: C.FM, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 2, marginBottom: 20 }}>
        <button style={tabStyle('anomalies')} onClick={() => setTab('anomalies')}>⚠️ Outbreak Alerts</button>
        <button style={tabStyle('heatmap')} onClick={() => setTab('heatmap')}>🗺 Disease Heatmap</button>
        <button style={tabStyle('events')} onClick={() => setTab('events')}>📋 Recent Events</button>
      </div>

      {/* OUTBREAK ALERTS */}
      {tab === 'anomalies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.textLo, fontSize: 13 }}>Analysing signals...</div>
          ) : anomalies.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', background: C.bg2, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.normal }}>No outbreak signals detected</div>
              <div style={{ fontSize: 12, color: C.textLo, marginTop: 4 }}>
                No region is showing a significant spike above the 7-day baseline.
              </div>
            </div>
          ) : anomalies.map((a: any, i: number) => (
            <div key={i} style={{
              padding: 16, borderRadius: 12, border: `1px solid ${a.status === 'critical' ? `${C.critical}50` : `${C.urgent}50`}`,
              background: a.status === 'critical' ? C.critBg : C.urgBg,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{a.status === 'critical' ? '🚨' : '⚠️'}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: a.status === 'critical' ? C.critical : C.urgent }}>
                      {a.disease} Spike — {REGION_COORDS[a.region]?.flag || ''} {REGION_COORDS[a.region]?.label || a.region}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMd, marginTop: 2 }}>
                      Detected {a.actualCount} cases in the last 7 days vs expected {a.baselineWeeklyExpected}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: a.status === 'critical' ? C.critical : C.urgent, fontFamily: C.FM }}>
                    +{a.percentageIncrease}%
                  </div>
                  <div style={{ fontSize: 10, color: C.textLo }}>vs 7-day baseline</div>
                </div>
              </div>
              <div style={{ marginTop: 12, height: 4, background: `${C.border}`, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, a.percentageIncrease)}%`, background: a.status === 'critical' ? C.critical : C.urgent, borderRadius: 2 }} />
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button style={{ padding: '5px 14px', borderRadius: 8, fontSize: 11, background: a.status === 'critical' ? C.critical : C.urgent, color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  Alert Public Health Authority
                </button>
                <button style={{ padding: '5px 14px', borderRadius: 8, fontSize: 11, background: 'transparent', color: C.textLo, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
                  Export Report
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DISEASE HEATMAP */}
      {tab === 'heatmap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* World Map */}
          <div style={{ position: 'relative', height: 340, background: `linear-gradient(180deg,${C.bg3},${C.bg2})`, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {/* Grid */}
            {[1,2,3,4,5,6,7].map(i => <div key={`h${i}`} style={{ position: 'absolute', top: `${14*i}%`, left: 0, right: 0, height: 1, background: `${C.border}60` }}/>)}
            {[1,2,3,4,5,6,7,8].map(i => <div key={`v${i}`} style={{ position: 'absolute', left: `${12.5*i}%`, top: 0, bottom: 0, width: 1, background: `${C.border}60` }}/>)}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.04, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 300 }}>🌍</div>
            <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 11, fontWeight: 700, color: C.textMd }}>Global Disease Incidence Map ({days}-day window)</div>

            {Object.entries(byRegion).map(([code, data]) => {
              const coord = REGION_COORDS[code];
              if (!coord) return null;
              const radius = Math.max(12, Math.min(36, (data.total / maxCases) * 36));
              const topDisease = Object.entries(data.diseases).sort(([,a],[,b]) => b-a)[0]?.[0];
              const color = DISEASE_COLORS[topDisease] || C.brand;
              const isCritical = data.total > maxCases * 0.6;
              return (
                <div key={code} style={{ position: 'absolute', left: `${coord.x}%`, top: `${coord.y}%`, transform: 'translate(-50%,-50%)' }}>
                  <div style={{
                    width: radius * 2, height: radius * 2, borderRadius: '50%',
                    background: `${color}50`, border: `2px solid ${color}`,
                    boxShadow: `0 0 ${radius}px ${color}60`,
                    animation: isCritical ? 'pulse 1.5s infinite' : undefined,
                  }}/>
                  <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 ${radius}px ${color}60}50%{box-shadow:0 0 ${radius*2}px ${color}90}}`}</style>
                  <div style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', textAlign: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 11, color: C.textHi, fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{coord.flag} {code}</div>
                    <div style={{ fontSize: 9, color: C.textLo, fontFamily: C.FM }}>{data.total} events</div>
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 10, right: 12, display: 'flex', gap: 8, background: C.bg3, padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}` }}>
              {Object.entries(DISEASE_COLORS).map(([d, c]) => (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }}/>
                  <span style={{ fontSize: 9, color: C.textLo }}>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Table */}
          <div style={{ background: C.bg2, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.textHi }}>Regional Breakdown</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr style={{ background: C.bg3 }}>
                    {['REGION', 'TOP DISEASE', 'TOTAL EVENTS', 'BREAKDOWN', 'SEVERITY'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, color: C.textLo, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byRegion).sort(([,a],[,b]) => b.total - a.total).map(([code, data]) => {
                    const coord = REGION_COORDS[code];
                    const topDisease = Object.entries(data.diseases).sort(([,a],[,b]) => b-a)[0];
                    const severity = data.total > maxCases * 0.6 ? 'High' : data.total > maxCases * 0.3 ? 'Medium' : 'Low';
                    return (
                      <tr key={code} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: C.textHi, fontWeight: 600 }}>
                          {coord?.flag || ''} {coord?.label || code}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12 }}>
                          <span style={{ color: DISEASE_COLORS[topDisease?.[0]] || C.brand, fontWeight: 600 }}>{topDisease?.[0] || '—'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: C.textHi, fontFamily: C.FM }}>{data.total}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {Object.entries(data.diseases).map(([d, n]) => (
                              <span key={d} style={{ padding: '2px 7px', borderRadius: 10, fontSize: 10, background: `${DISEASE_COLORS[d] || C.brand}20`, color: DISEASE_COLORS[d] || C.brand, border: `1px solid ${DISEASE_COLORS[d] || C.brand}30` }}>
                                {d}: {n}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 9px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: severity === 'High' ? `${C.critical}20` : severity === 'Medium' ? `${C.urgent}20` : `${C.normal}20`, color: severity === 'High' ? C.critical : severity === 'Medium' ? C.urgent : C.normal }}>
                            {severity}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {Object.keys(byRegion).length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: C.textLo, fontSize: 12 }}>No epidemiology data yet. Run the seed script to populate data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RECENT EVENTS */}
      {tab === 'events' && (
        <div style={{ background: C.bg2, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.textHi }}>
            Recent AI-Detected Events ({events.length} shown)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: C.bg3 }}>
                  {['DISEASE', 'REGION', 'SUB-REGION', 'SEVERITY', 'CONFIDENCE', 'SOURCE', 'DETECTED'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, color: C.textLo, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: C.textLo }}>No events yet</td></tr>
                ) : events.map((e: any) => (
                  <tr key={e.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: DISEASE_COLORS[e.disease] || C.brand }}>{e.disease}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: C.textHi }}>{REGION_COORDS[e.region]?.flag || ''} {e.region}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: C.textMd }}>{e.subRegion || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 11 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 8, background: e.severity === 'High' ? `${C.critical}20` : `${C.urgent}20`, color: e.severity === 'High' ? C.critical : C.urgent, fontWeight: 600 }}>{e.severity}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <ConfidenceIndicator value={e.confidenceScore} size="sm" showLabel={false} />
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 11 }}>
                      <span style={{ padding: '2px 7px', borderRadius: 6, background: e.scanOrigin === 'edge' ? `${C.urgent}20` : `${C.brand}20`, color: e.scanOrigin === 'edge' ? C.urgent : C.brand, fontSize: 10 }}>
                        {e.scanOrigin === 'edge' ? '📡 Edge' : '☁️ Cloud'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 11, color: C.textLo, fontFamily: C.FM }}>{new Date(e.detectedAt).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
