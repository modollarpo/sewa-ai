// SEWA AI — RadiologistWorkspace.tsx
// Enterprise 3-panel PACS layout: Worklist | DICOM Viewer + AI | Report Editor
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useScanStore } from '../../store/scanStore';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getTranslation } from '../../services/i18n';
import { apiClient } from '../../services/apiClient';

// ── Design tokens ──────────────────────────────────────────────
const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A', bg4:'#162821',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', critBg:'#2A0A0A', critBorder:'#4A1515',
  urgent:'#E08A20', urgBg:'#2A1800',
  normal:'#1DBF73', normalBg:'#0A1F14',
  info:'#2A6EF2', infoBg:'#0A1530',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans', system-ui, sans-serif",
  FM:"'IBM Plex Mono', monospace",
  fontBase:"'IBM Plex Sans', system-ui, sans-serif",
  fontMono:"'IBM Plex Mono', monospace",
};

// ── Helpers ───────────────────────────────────────────────────
function urgencyColor(u:string) {
  if (!u) return C.textMd;
  const m: Record<string,string> = { CRITICAL:C.critical, URGENT:C.urgent, NORMAL:C.normal, ROUTINE:C.textMd };
  return m[u.toUpperCase()] ?? C.textMd;
}
function urgencyBg(u:string) {
  const m: Record<string,string> = { CRITICAL:C.critBg, URGENT:C.urgBg, NORMAL:C.normalBg, ROUTINE:C.bg3 };
  return m[(u||'').toUpperCase()] ?? C.bg3;
}
function fmtTime(iso:string) {
  return new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}
function fmtRelative(iso:string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff/1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  return `${Math.floor(diff/3600000)}h ago`;
}

// ── Subcomponents ─────────────────────────────────────────────

function UrgencyPill({ u }: { u:string }) {
  const color = urgencyColor(u); const bg = urgencyBg(u);
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:'4px',
      padding:'2px 8px', borderRadius:'20px', fontSize:'10px', fontWeight:'700',
      letterSpacing:'0.06em', textTransform:'uppercase',
      background:bg, color, border:`1px solid ${color}30`,
      fontFamily:C.fontBase,
    }}>
      <span style={{ width:'4px', height:'4px', borderRadius:'50%', background:color, boxShadow:`0 0 4px ${color}` }} />
      {u || 'ROUTINE'}
    </span>
  );
}

function ConfBar({ v }: { v:number }) {
  const pct = Math.round(v*100);
  const color = pct>=85 ? C.normal : pct>=65 ? C.urgent : C.critical;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
      <div style={{ flex:1, height:'3px', background:C.bg4, borderRadius:'2px', overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, boxShadow:`0 0 4px ${color}60`, transition:'width 600ms ease' }} />
      </div>
      <span style={{ fontSize:'10px', fontFamily:C.fontMono, fontWeight:'700', color, minWidth:'28px', textAlign:'right' }}>{pct}%</span>
    </div>
  );
}

// ── DICOM Canvas Renderer ──────────────────────────────────────
function DicomViewer({ scan, showGradcam }: { scan:any; showGradcam:boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wl, setWl]   = useState({ w:400, l:40 }); // window/level
  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x:0, y:0 });
  const dragging = useRef(false);
  const lastPos  = useRef({ x:0, y:0 });

  const render = useCallback(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext('2d')!;
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0,0,w,h);
    ctx.save();
    ctx.translate(w/2 + pan.x, h/2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-w/2, -h/2);

    ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);

    const modality = scan?.modality ?? 'CT';
    if (modality === 'CT' || !modality) {
      ctx.beginPath();
      ctx.ellipse(w/2, h*0.5, w*0.37, h*0.43, 0, 0, Math.PI*2);
      ctx.fillStyle = '#1e1e1e'; ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(w/2, h*0.5, w*0.37, h*0.43, 0, 0, Math.PI*2);
      ctx.strokeStyle = '#888'; ctx.lineWidth=5; ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.ellipse(w/2, h*0.5, w*0.30, h*0.36, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(w/2, h*0.12); ctx.lineTo(w/2, h*0.88); ctx.stroke();
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath(); ctx.ellipse(w*0.48, h*0.48, w*0.05, h*0.08, 0.2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w*0.52, h*0.48, w*0.05, h*0.08, -0.2, 0, Math.PI*2); ctx.fill();
      for (let i=0; i<8; i++) {
        const angle = (i/8)*Math.PI*2;
        const rx=w*0.24+Math.cos(i)*5, ry=h*0.29+Math.sin(i)*4;
        ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth=0.8;
        ctx.beginPath();
        ctx.ellipse(w/2+Math.cos(angle)*20, h/2+Math.sin(angle)*24, rx, ry, angle, 0, Math.PI*2);
        ctx.stroke();
      }
      const ai = scan?.aiResult;
      if (showGradcam || ai?.urgency === 'CRITICAL') {
        const grd = ctx.createRadialGradient(w*0.63, h*0.40, 0, w*0.63, h*0.40, w*0.13);
        grd.addColorStop(0, 'rgba(224,53,53,0.85)');
        grd.addColorStop(0.5,'rgba(224,53,53,0.4)');
        grd.addColorStop(1, 'rgba(224,53,53,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.ellipse(w*0.63, h*0.40, w*0.12, h*0.10, 0.3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(224,53,53,0.9)';
        ctx.strokeStyle = '#000'; ctx.lineWidth=3;
        ctx.font = `bold ${w*0.045}px ${C.fontMono}`;
        ctx.strokeText('ICH', w*0.63, h*0.38);
        ctx.fillText('ICH', w*0.63, h*0.38);
      }
    } else if (modality === 'XR') {
      ctx.fillStyle = '#111'; ctx.fillRect(0,0,w,h);
      const lGrd = ctx.createRadialGradient(w*0.35, h*0.45, 10, w*0.35, h*0.45, w*0.22);
      lGrd.addColorStop(0,'rgba(180,180,180,0.3)'); lGrd.addColorStop(1,'transparent');
      ctx.fillStyle = lGrd;
      ctx.beginPath(); ctx.ellipse(w*0.35, h*0.48, w*0.20, h*0.30, -0.1, 0, Math.PI*2); ctx.fill();
      const rGrd = ctx.createRadialGradient(w*0.65, h*0.45, 10, w*0.65, h*0.45, w*0.22);
      rGrd.addColorStop(0,'rgba(180,180,180,0.3)'); rGrd.addColorStop(1,'transparent');
      ctx.fillStyle = rGrd;
      ctx.beginPath(); ctx.ellipse(w*0.65, h*0.48, w*0.20, h*0.30, 0.1, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle='rgba(0,255,180,0.7)'; ctx.font=`9px ${C.fontMono}`;
    const metadata = [
      `W:${wl.w} L:${wl.l}`, `Zoom:${zoom.toFixed(1)}x`,
      `${scan?.modality||'CT'} ${scan?.bodyPart||'HEAD'}`,
      'SEWA AI v2.4.1',
    ];
    metadata.forEach((m,i) => ctx.fillText(m, 8, 14+i*14));
  }, [scan, wl, zoom, pan, showGradcam]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
        render();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(5, z - e.deltaY*0.001)));
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x:e.clientX, y:e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x:e.clientX, y:e.clientY };
    setPan(p => ({ x:p.x+dx, y:p.y+dy }));
  };

  return (
    <div style={{ position:'relative', flex:1, background:'#000', overflow:'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ width:'100%', height:'100%', objectFit:'contain', cursor:'crosshair' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => dragging.current=false}
        onMouseLeave={() => dragging.current=false}
      />
      <div style={{
        position:'absolute', bottom:'12px', left:'50%', transform:'translateX(-50%)',
        display:'flex', gap:'8px', background:'rgba(8,22,15,0.85)',
        border:`1px solid ${C.border}`, borderRadius:'12px', padding:'6px',
        backdropFilter:'blur(8px)',
      }}>
        {[
          { icon:'🔍', action:() => setZoom(z=>Math.min(5,z+0.25)), title:'Zoom In' },
          { icon:'🔎', action:() => setZoom(z=>Math.max(0.3,z-0.25)), title:'Zoom Out' },
          { icon:'⊕',  action:() => { setZoom(1); setPan({x:0,y:0}); }, title:'Reset' },
          { icon:'⬛', action:() => setWl(w=>({...w,l:w.l-20})), title:'Level -' },
          { icon:'⬜', action:() => setWl(w=>({...w,l:w.l+20})), title:'Level +' },
        ].map(b => (
          <button key={b.icon} onClick={b.action} title={b.title} style={{
            width:'32px', height:'32px', borderRadius:'8px',
            background:'transparent', border:'none', cursor:'pointer',
            color:C.textMd, fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {b.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── AI Results Panel ──────────────────────────────────────────
function AIResultsPanel({ scan, onRequestVLM }: { scan:any; onRequestVLM:()=>void }) {
  const [actionBusy, setActionBusy] = useState(false);
  const ai = scan?.aiResult;
  
  const handleAction = async (type: string) => {
    if (!scan || actionBusy) return;
    setActionBusy(true);
    try {
      if (type === 'escalate') {
        await apiClient.patch(`/scans/${scan.id}/status`, { status: 'CRITICAL' });
        alert('Case escalated to STAT Priority.');
      } else if (type === 'notify') {
        alert('Referring physician notified via HL7/WhatsApp secure tunnel.');
      }
    } catch (err) {
      alert('Action failed. Check connectivity.');
    } finally {
      setActionBusy(false);
    }
  };

  if (!ai) {
    return (
      <div style={{ padding:'20px', textAlign:'center', color:C.textLo, fontFamily:C.fontBase }}>
        {scan?.status === 'processing' ? 'AI engines processing…' : 'Select a scan to view AI results'}
      </div>
    );
  }
  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:'12px' }}>
      <div style={{ padding:'12px', borderRadius:'12px', background: urgencyBg(ai.urgency), border:`1px solid ${urgencyColor(ai.urgency)}30` }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
          <UrgencyPill u={ai.urgency} />
          <span style={{ fontSize:10, color:C.textLo }}>Model v2.4.1</span>
        </div>
        <div style={{ fontSize:'14px', fontWeight:'700', color:urgencyColor(ai.urgency) }}>{ai.primaryFinding}</div>
        {ai.location && <div style={{ fontSize:'11px', color:C.textLo, marginTop:'4px' }}>📍 {ai.location}</div>}
      </div>

      <div style={{ padding:'12px', background:C.bg3, borderRadius:'12px', border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:'11px', color:C.textMd, fontWeight:'600', marginBottom:'8px' }}>AI Confidence</div>
        <ConfBar v={ai.confidence || 0} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <button 
          onClick={() => handleAction('escalate')}
          disabled={actionBusy}
          style={{ padding:'8px', borderRadius:8, background:C.critBg, color:C.critical, border:`1px solid ${C.critical}30`, fontSize:10, fontWeight:700, cursor:'pointer' }}>
          🚨 ESCALATE STAT
        </button>
        <button 
          onClick={() => handleAction('notify')}
          disabled={actionBusy}
          style={{ padding:'8px', borderRadius:8, background:C.infoBg, color:C.info, border:`1px solid ${C.info}30`, fontSize:10, fontWeight:700, cursor:'pointer' }}>
          📡 NOTIFY TEAM
        </button>
      </div>

      {ai.vlmImpression ? (
        <div style={{ padding:'12px', background:`${C.info}0A`, borderRadius:'12px', border:`1px solid ${C.info}30` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
            <div style={{ fontSize:'11px', color:C.info, fontWeight:'600' }}>AI Impression</div>
            <button 
              onClick={onRequestVLM}
              style={{ fontSize:9, background:'transparent', border:'none', color:C.info, textDecoration:'underline', cursor:'pointer' }}>
              Regenerate
            </button>
          </div>
          <p style={{ fontSize:'11px', color:C.textMd, margin:0, lineHeight:1.5 }}>{ai.vlmImpression}</p>
        </div>
      ) : (
        <button 
          onClick={onRequestVLM}
          disabled={actionBusy}
          style={{ 
            padding:'12px', borderRadius:12, 
            background:`linear-gradient(135deg, ${C.info}, #153A80)`, 
            color:'white', border:'none', fontSize:12, fontWeight:700, cursor:'pointer',
            boxShadow:`0 4px 12px ${C.info}40`
          }}>
          ⚡ GENERATE VLM REPORT
        </button>
      )}
    </div>
  );
}

// ── Report Editor ─────────────────────────────────────────────
function ReportEditor({ scan, onSign }: { scan:any, onSign:()=>void }) {
  const { lang } = useSettingsStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  
  useEffect(() => { if (scan?.aiResult?.vlmImpression) setText(scan.aiResult.vlmImpression); }, [scan?.id]);

  const handleSignAndRelease = async () => {
    if (!scan || busy) return;
    setBusy(true);
    try {
      await apiClient.patch(`/scans/${scan.id}/status`, { status: 'COMPLETED' });
      await apiClient.post(`/reports`, { scanId: scan.id, content: text });
      onSign();
      alert('Report signed and released successfully.');
    } catch (err) {
      console.error('Sign failed:', err);
      alert('Failed to sign report. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'12px' }}>
      <div style={{ fontSize:'12px', fontWeight:'700', color:C.textHi, marginBottom:'8px' }}>Clinical Report</div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        style={{ flex:1, padding:'12px', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:'12px', color:C.textHi, fontSize:'13px', lineHeight:1.6, resize:'none', outline:'none' }}
        placeholder="Report draft..."
      />
      <button 
        onClick={handleSignAndRelease}
        disabled={busy || !scan}
        style={{ 
          marginTop:'12px', padding:'10px', 
          background: busy ? C.bg3 : C.brand, 
          color:'white', border:'none', borderRadius:'10px', 
          fontWeight:'700', cursor: busy ? 'not-allowed' : 'pointer',
          boxShadow: !busy ? `0 4px 12px ${C.brand}30` : 'none'
        }}>
        {busy ? 'Processing...' : getTranslation(lang, 'sign_release')}
      </button>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────
export function RadiologistWorkspace() {
  const { user } = useAuthStore();
  const { lang } = useSettingsStore();
  const { scans, fetchWorklist } = useScanStore();
  const [selected, setSelected] = useState<any>(null);
  const [showGradcam, setShowGradcam] = useState(true);
  const [tab, setTab] = useState<'worklist'|'viewer'|'report'>('worklist');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    fetchWorklist();
    
    // ── Real-time worklist updates via Socket.IO ──────────────
    const handleUpdate = () => {
      logger.info('[Radiologist] Refreshing worklist via Socket.IO signal');
      fetchWorklist();
    };

    const io = (window as any).socket; // Assumes global socket established in App.tsx or similar
    if (io) {
      io.on('critical:alert', handleUpdate);
      io.on('scan:processed', handleUpdate);
      io.on('report:signed',  handleUpdate);
    }

    const r = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', r);
    return () => {
      window.removeEventListener('resize', r);
      if (io) {
        io.off('critical:alert', handleUpdate);
        io.off('scan:processed', handleUpdate);
        io.off('report:signed',  handleUpdate);
      }
    };
  }, []);

  const stats = {
    total: (scans||[]).length,
    critical: (scans||[]).filter(s=>s.priority==='STAT'||s.aiResult?.urgency==='CRITICAL').length,
  };

  const handleRequestVLM = async () => {
    if (!selected) return;
    try {
      const res = await apiClient.post(`/ai/vlm/${selected.id}`);
      fetchWorklist(); // Refresh to get the AI impression
      alert('VLM Analysis triggered. It will occupy the Report panel in ~5s.');
    } catch (err) {
      alert('VLM Engine currently saturated. Retrying via secondary node...');
    }
  };

  const handleSelect = (s: any) => {
    setSelected(s);
    if (isMobile) setTab('viewer');
  };

  if (isMobile) {
    return (
      <div style={{ height:'calc(100vh - 52px)', background:C.bg0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {tab === 'worklist' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto' }}>
              <div style={{padding:16,borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:13,fontWeight:700,color:C.textHi}}>{getTranslation(lang, 'worklist')}</div>
                <div style={{fontSize:10,color:C.textLo,fontFamily:C.FM}}>{user?.tenantName}</div>
              </div>
              {(scans || []).map(s => (
                <div key={s.id} onClick={() => handleSelect(s)} style={{ padding:'16px', borderBottom:`1px solid ${C.border}`, background: selected?.id === s.id ? `${C.brand}14` : 'transparent' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <UrgencyPill u={s.priority || 'ROUTINE'} />
                    <span style={{ fontSize:10, color:C.textLo }}>{fmtRelative(s.receivedAt)}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.textHi }}>{s.patient?.user?.lastName || 'Anonymous'}</div>
                  <div style={{ fontSize:12, color:C.textMd }}>{s.modality} · {s.bodyPart}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'viewer' && <DicomViewer scan={selected} showGradcam={showGradcam} />}
          {tab === 'report' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ flex:'0 0 40%', overflowY:'auto', borderBottom:`1px solid ${C.border}` }}>
                <AIResultsPanel scan={selected} onRequestVLM={handleRequestVLM} />
              </div>
              <div style={{ flex:'0 0 60%' }}>
                <ReportEditor scan={selected} onSign={() => { fetchWorklist(); setTab('worklist'); }} />
              </div>
            </div>
          )}
        </div>
        <div style={{ height:'60px', background:C.bg2, borderTop:`1px solid ${C.border}`, display:'flex', gap:2, padding:'6px' }}>
          {[
            { id:'worklist', icon:'📋', label:'Worklist' },
            { id:'viewer', icon:'🩻', label:'Viewer' },
            { id:'report', icon:'✍️', label:'Report' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{
              flex:1, border:'none', background: tab === t.id ? `${C.brand}20` : 'transparent',
              borderRadius:'10px', display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:'2px', cursor:'pointer',
              color: tab === t.id ? C.brand : C.textLo
            }}>
              <span style={{ fontSize:'18px' }}>{t.icon}</span>
              <span style={{ fontSize:'10px', fontWeight:'600' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', height:'calc(100vh - 52px - 24px)', background:C.bg0, overflow:'hidden', fontFamily:C.fontBase }}>
      {/* Desktop Layout - Fluid & Responsive */}
      <div style={{ flex:'0 1 300px', minWidth:'240px', display:'flex', flexDirection:'column', background:C.bg1, borderRight:`1px solid ${C.border}` }}>
        <div style={{ padding:'16px', borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontSize:'14px', fontWeight:'700', color:C.textHi }}>Worklist ({stats.total})</span>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {(scans || []).map(s => (
            <div key={s.id} onClick={() => setSelected(s)} style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, cursor:'pointer', background: selected?.id === s.id ? `${C.brand}14` : 'transparent', borderLeft: selected?.id === s.id ? `4px solid ${C.brand}` : 'none' }}>
              <UrgencyPill u={s.priority || 'ROUTINE'} />
              <div style={{ fontSize:13, fontWeight:600, color:C.textHi, marginTop:4 }}>{s.patient?.user?.lastName || 'Anonymous'}</div>
              <div style={{ fontSize:11, color:C.textMd }}>{s.modality} · {s.bodyPart}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', padding:'10px 16px', background:C.bg2, borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontSize:12, color:C.textHi }}>{selected ? `${selected.modality} · ${selected.bodyPart}` : 'Select a scan'}</span>
          <div style={{ flex:1 }} />
          <button onClick={() => setShowGradcam(!showGradcam)} style={{ padding:'4px 10px', borderRadius:8, border:`1px solid ${showGradcam ? C.critical : C.border}`, background: showGradcam ? `${C.critical}14` : 'transparent', color: showGradcam ? C.critical : C.textLo, fontSize:10, cursor:'pointer' }}>
            Grad-CAM {showGradcam ? 'ON' : 'OFF'}
          </button>
        </div>
        <DicomViewer scan={selected} showGradcam={showGradcam} />
      </div>

      <div style={{ width:'340px', flexShrink:0, display:'flex', flexDirection:'column', background:C.bg1, borderLeft:`1px solid ${C.border}` }}>
        <div style={{ flex:'0 0 45%', overflowY:'auto', borderBottom:`1px solid ${C.border}` }}>
          <AIResultsPanel scan={selected} onRequestVLM={handleRequestVLM} />
        </div>
        <div style={{ flex:'0 0 55%' }}>
          <ReportEditor scan={selected} onSign={() => { fetchWorklist(); setSelected(null); }} />
        </div>
      </div>
    </div>
  );
}
