import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { apiClient } from '../../services/apiClient';

import { dashboardColors as C } from '../../design-system/tokens';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: C.bg2, border: `1px solid ${C.border}`, padding: '10px 14px', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 11, color: C.textMd, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.brand, fontFamily: C.FM }}>{payload[0].value} cm³</div>
      </div>
    );
  }
  return null;
};

export function PatientProfile({ patientId, onBack }: { patientId: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    apiClient.get(`/ai/progression/${patientId}`)
      .then(res => setData(res.data))
      .catch(() => { /* progression data unavailable */ })
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return <div style={{ padding: 40, color: C.textLo, textAlign: 'center', fontFamily: C.F }}>Loading longitudinal record...</div>;
  }

  if (!data || !data.patient) {
    return <div style={{ padding: 40, color: C.critical, textAlign: 'center', fontFamily: C.F }}>Patient record not found.</div>;
  }

  const chartData = [...data.timeline].reverse(); // reverse to chronological for chart

  return (
    <div style={{ padding: '24px', background: C.bg1, minHeight: '100vh', fontFamily: C.F }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.textLo, cursor: 'pointer', fontSize: 12, marginBottom: 12, padding: 0 }}>
            ← Back to Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.bg3, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {data.patient.sex === 'F' ? '👩🏽' : data.patient.sex === 'M' ? '👨🏽' : '👤'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.textHi }}>{data.patient.name}</h2>
              <div style={{ fontSize: 12, color: C.textMd, marginTop: 4, display: 'flex', gap: 12 }}>
                <span>MRN: <strong style={{ color: C.textHi, fontFamily: C.FM }}>{data.patient.mrn}</strong></span>
                <span>DOB: <strong style={{ color: C.textHi }}>{new Date(data.patient.dob).toLocaleDateString()}</strong></span>
                <span>Blood: <strong style={{ color: C.critical }}>{data.patient.bloodType || 'Unknown'}</strong></span>
              </div>
            </div>
          </div>
        </div>
        <button style={{ padding: '8px 16px', background: `${C.brand}20`, color: C.brand, border: `1px solid ${C.brand}50`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          Export Record
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        
        {/* Left Col: Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Scans', value: data.metrics.totalScans, color: C.textHi },
              { label: 'Latest Vol', value: `${data.metrics.latestVolume} cm³`, color: C.brand },
              { label: 'Growth Rate', value: data.metrics.growthRate, color: parseFloat(data.metrics.growthRate) > 5 ? C.urgent : C.normal },
              { label: 'Critical Flags', value: data.metrics.criticalFlags, color: data.metrics.criticalFlags > 0 ? C.critical : C.textMd },
            ].map((m, i) => (
              <div key={i} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: C.textLo, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{m.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: m.color, fontFamily: C.FM }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 14, color: C.textHi }}>Longitudinal Tumor Progression (Volume cm³)</h3>
              <span style={{ fontSize: 10, padding: '2px 8px', background: `${C.brand}20`, color: C.brand, borderRadius: 10, border: `1px solid ${C.brand}40` }}>
                AI Registered (SimpleElastix)
              </span>
            </div>
            
            <div style={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="displayDate" stroke={C.textLo} fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis stroke={C.textLo} fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="tumorVolume" stroke={C.brand} strokeWidth={3} dot={{ r: 4, fill: C.bg2, stroke: C.brand, strokeWidth: 2 }} activeDot={{ r: 6, fill: C.brand, stroke: C.bg2, strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col: Timeline Feed */}
        <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: 14, color: C.textHi }}>Clinical History</h3>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {data.timeline.map((s: any, idx: number) => (
                <div key={s.id} style={{ position: 'relative' }}>
                  {/* Timeline line */}
                  {idx < data.timeline.length - 1 && (
                    <div style={{ position: 'absolute', left: 5, top: 20, bottom: -20, width: 2, background: C.border }} />
                  )}
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.status === 'CRITICAL' ? C.critical : C.brand, border: `3px solid ${C.bg2}`, marginTop: 4, zIndex: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: C.textLo, fontFamily: C.FM, marginBottom: 4 }}>{s.displayDate}</div>
                      <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.textHi }}>{s.modality} {s.bodyPart}</span>
                          <span style={{ fontSize: 10, color: s.status === 'CRITICAL' ? C.critical : C.textLo }}>{s.status}</span>
                        </div>
                        <div style={{ fontSize: 13, color: s.status === 'CRITICAL' ? '#ffcccc' : C.textHi, marginBottom: 8 }}>
                          {s.finding}
                        </div>
                        <div style={{ fontSize: 11, color: C.textMd, lineHeight: 1.5 }}>
                          {s.vlmImpression}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
