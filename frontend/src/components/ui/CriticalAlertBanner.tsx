// SEWA AI — CriticalAlertBanner.tsx
// Sticky top banner for STAT/CRITICAL AI findings — animated, dismissible, multi-alert
import React, { useState, useEffect } from 'react';
import { useScanStore } from '../../store/scanStore';

const C = {
  critical:'#E03535', critBg:'#2A0A0A', critBorder:'#5A1515',
  urgent:'#E08A20',   urgBg:'#2A1800',  urgBorder:'#5A3000',
  stroke:'#8B5CF6',   strokeBg:'#1a0a30', strokeBorder:'#3a1a60',
  textHi:'#D0ECE6', white:'#FFFFFF',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

interface Alert {
  id?: string;
  type?: string;
  urgency?: string;
  primaryFinding?: string;
  scanId?: string;
  confidence?: number;
  location?: string;
  aiResult?: { urgency?:string; primaryFinding?:string; confidence?:number };
}

interface Props {
  alerts: Alert[];
}

export function CriticalAlertBanner({ alerts }: Props) {
  const acknowledgeAlert = useScanStore(s => s.acknowledgeAlert);
  const [activeIdx, setActiveIdx] = useState(0);

  const visible = alerts; // Filtered by the store's logic

  // Cycle through multiple alerts
  useEffect(() => {
    if (visible.length <= 1) return;
    const t = setInterval(() => setActiveIdx(i => (i + 1) % visible.length), 4000);
    return () => clearInterval(t);
  }, [visible.length]);

  if (!visible.length) return null;

  const alert = visible[Math.min(activeIdx, visible.length - 1)];
  const id = alert.id ?? alert.scanId ?? 'unknown';
  const urgency = (alert.urgency ?? alert.aiResult?.urgency ?? 'CRITICAL').toUpperCase();
  const finding = alert.primaryFinding ?? alert.aiResult?.primaryFinding ?? 'Critical finding detected';
  const conf    = alert.confidence ?? alert.aiResult?.confidence;
  const isStroke = alert.type === 'stroke_code' || finding.toLowerCase().includes('stroke') || finding.toLowerCase().includes('lvo');

  const colors = isStroke
    ? { bg: C.strokeBg, border: C.strokeBorder, accent: C.stroke }
    : urgency === 'CRITICAL'
      ? { bg: C.critBg,   border: C.critBorder,  accent: C.critical }
      : { bg: C.urgBg,    border: C.urgBorder,   accent: C.urgent };

  return (
    <div style={{
      position:'sticky', top:0, zIndex:300,
      background: colors.bg,
      borderBottom: `2px solid ${colors.accent}`,
      borderTop: `2px solid ${colors.accent}`,
      boxShadow: `0 0 24px ${colors.accent}30, 0 4px 12px rgba(0,0,0,0.5)`,
      animation: 'alertSlideIn 300ms ease',
    }}>
      <style>{`
        @keyframes alertSlideIn { from { opacity:0; transform:translateY(-100%); } to { opacity:1; transform:none; } }
        @keyframes alertPulse { 0%,100% { box-shadow: 0 0 8px ${colors.accent}60; } 50% { box-shadow: 0 0 20px ${colors.accent}; } }
      `}</style>

      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px', minHeight:44 }}>

        {/* Animated indicator */}
        <div style={{
          width:10, height:10, borderRadius:'50%', flexShrink:0,
          background: colors.accent,
          animation: 'alertPulse 1s infinite',
          boxShadow: `0 0 8px ${colors.accent}`,
        }}/>

        {/* Badge */}
        <span style={{
          padding:'2px 10px', borderRadius:20, fontSize:10, fontWeight:800,
          background: `${colors.accent}30`, color: colors.accent,
          border: `1px solid ${colors.border}`,
          fontFamily:C.FM, letterSpacing:'0.08em', flexShrink:0,
          textTransform:'uppercase',
        }}>
          {isStroke ? '⚡ STROKE CODE' : `🚨 ${urgency}`}
        </span>

        {/* Finding text */}
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:10, overflow:'hidden' }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.white, fontFamily:C.F, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {finding}
          </span>
          {alert.location && (
            <span style={{ fontSize:11, color:colors.accent, fontFamily:C.F, flexShrink:0 }}>
              📍 {alert.location}
            </span>
          )}
          {conf != null && (
            <span style={{ fontSize:10, color:colors.accent, fontFamily:C.FM, flexShrink:0 }}>
              {(conf * 100).toFixed(0)}% confidence
            </span>
          )}
          {alert.scanId && (
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontFamily:C.FM, flexShrink:0 }}>
              #{alert.scanId.slice(-8)}
            </span>
          )}
        </div>

        {/* Multi-alert counter */}
        {visible.length > 1 && (
          <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            <span style={{ fontSize:10, color:colors.accent, fontFamily:C.F }}>
              {activeIdx + 1} / {visible.length}
            </span>
            <div style={{ display:'flex', gap:2 }}>
              {visible.map((_, i) => (
                <div key={i} onClick={() => setActiveIdx(i)}
                  style={{ width:5, height:5, borderRadius:'50%', cursor:'pointer',
                    background: i === activeIdx ? colors.accent : `${colors.accent}30` }}/>
              ))}
            </div>
          </div>
        )}

        {/* View scan CTA */}
        {alert.scanId && (
          <button style={{
            padding:'5px 12px', borderRadius:7, cursor:'pointer', flexShrink:0,
            background: colors.accent, border:'none',
            color:'white', fontSize:11, fontWeight:700, fontFamily:C.F,
          }}>
            View Scan →
          </button>
        )}

        {/* Dismiss */}
        <button onClick={() => acknowledgeAlert(id)}
          style={{ width:26, height:26, borderRadius:6, border:`1px solid ${colors.border}`, background:'transparent', cursor:'pointer', color:colors.accent, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
          ✕
        </button>
      </div>
    </div>
  );
}
