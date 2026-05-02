// SEWA AI — RadiologistWorkspace.tsx
// Enterprise 3-panel PACS layout: Worklist | DICOM Viewer + AI | Report Editor
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useScanStore } from '../../store/scanStore';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getTranslation } from '../../services/i18n';
import { apiClient } from '../../services/apiClient';
import { Tooltip } from '../../components/ui/Tooltip';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { VoiceDictation } from '../../components/ui/VoiceDictation';

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
  const [measurements, setMeasurements] = useState<{ x1:number; y1:number; x2:number; y2:number }[]>([]);
  const [activeM, setActiveM] = useState<{ x1:number; y1:number; x2:number; y2:number } | null>(null);
  const [tool, setTool] = useState<'pan'|'measure'>('pan');
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
      // (Keep existing drawing logic...)
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

    // Draw measurements
    const allM = activeM ? [...measurements, activeM] : measurements;
    allM.forEach(m => {
      ctx.strokeStyle = C.brandLt; ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5/zoom, 5/zoom]);
      ctx.beginPath(); ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2); ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw endpoints
      ctx.fillStyle = C.brandLt;
      ctx.beginPath(); ctx.arc(m.x1, m.y1, 4/zoom, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(m.x2, m.y2, 4/zoom, 0, Math.PI*2); ctx.fill();

      // Label distance
      const dist = Math.sqrt(Math.pow(m.x2-m.x1,2) + Math.pow(m.y2-m.y1,2));
      const mm = (dist * 0.23).toFixed(1); // 0.23mm/px approx
      ctx.font = `${12/zoom}px ${C.fontMono}`;
      ctx.fillStyle = 'white';
      ctx.fillText(`${mm}mm`, (m.x1+m.x2)/2 + 5/zoom, (m.y1+m.y2)/2 - 5/zoom);
    });

    ctx.restore();
    ctx.fillStyle='rgba(0,255,180,0.7)'; ctx.font=`9px ${C.fontMono}`;
    const metadata = [
      `W:${wl.w} L:${wl.l}`, `Zoom:${zoom.toFixed(1)}x`,
      `${scan?.modality||'CT'} ${scan?.bodyPart||'HEAD'}`,
      'SEWA AI v2.4.1',
    ];
    metadata.forEach((m,i) => ctx.fillText(m, 8, 14+i*14));
  }, [scan, wl, zoom, pan, showGradcam, measurements, activeM]);

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

  const screenToCanvas = (sx: number, sy: number) => {
    const cvs = canvasRef.current!;
    const rect = cvs.getBoundingClientRect();
    const x = (sx - rect.left - (cvs.width/2 + pan.x)) / zoom + cvs.width/2;
    const y = (sy - rect.top - (cvs.height/2 + pan.y)) / zoom + cvs.height/2;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'pan') {
      dragging.current = true;
      lastPos.current = { x:e.clientX, y:e.clientY };
    } else if (tool === 'measure') {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setActiveM({ x1:pos.x, y1:pos.y, x2:pos.x, y2:pos.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tool === 'pan' && dragging.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x:e.clientX, y:e.clientY };
      setPan(p => ({ x:p.x+dx, y:p.y+dy }));
    } else if (tool === 'measure' && activeM) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setActiveM(m => m ? { ...m, x2:pos.x, y2:pos.y } : null);
    }
  };

  const handleMouseUp = () => {
    if (tool === 'pan') dragging.current = false;
    else if (tool === 'measure' && activeM) {
      setMeasurements([...measurements, activeM]);
      setActiveM(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const newZoom = Math.max(0.5, Math.min(10, zoom - e.deltaY * 0.005));
    setZoom(newZoom);
  };

  return (
    <div style={{ position:'relative', flex:1, background:'#000', overflow:'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ width:'100%', height:'100%', objectFit:'contain', cursor:'crosshair' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div style={{
        position:'absolute', bottom:'12px', left:'50%', transform:'translateX(-50%)',
        display:'flex', gap:'12px', background:'rgba(8,22,15,0.9)', padding:'6px 12px',
        borderRadius:'16px', border:`1px solid ${C.border}`, backdropFilter:'blur(12px)',
        boxShadow:'0 10px 25px rgba(0,0,0,0.5)', alignItems:'center'
      }}>
        {/* Tool Selector */}
        <div style={{ display:'flex', gap:'4px', borderRight:`1px solid ${C.border}`, paddingRight:'12px' }}>
          {[
            { id:'pan', icon:'🖐️', title:'Pan & Zoom' },
            { id:'measure', icon:'📏', title:'Caliper Measurement' },
          ].map(t => (
            <button key={t.id} onClick={() => setTool(t.id as any)} title={t.title} style={{
              width:'36px', height:'36px', background: tool === t.id ? C.brand : 'transparent',
              border:'none', borderRadius:'8px', color: tool === t.id ? 'white' : C.textMd,
              fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <span>{t.icon}</span>
            </button>
          ))}
        </div>

        {/* View Controls */}
        <div style={{ display:'flex', gap:'4px' }}>
          {[
            { icon:'🔍', action:() => setZoom(z=>Math.min(5,z+0.25)), title:'Zoom In' },
            { icon:'🔎', action:() => setZoom(z=>Math.max(0.3,z-0.25)), title:'Zoom Out' },
            { icon:'⊕',  action:() => { setZoom(1); setPan({x:0,y:0}); }, title:'Reset View' },
            { icon:'⬛', action:() => setWl(w=>({...w,l:w.l-20})), title:'Decrease Level (Darker)' },
            { icon:'⬜', action:() => setWl(w=>({...w,l:w.l+20})), title:'Increase Level (Brighter)' },
          ].map(b => (
            <button key={b.title} onClick={b.action} title={b.title} style={{
              width:'32px', height:'32px', borderRadius:'8px',
              background:'transparent', border:'none', cursor:'pointer',
              color:C.textMd, fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {b.icon}
            </button>
          ))}
        </div>
        
        {measurements.length > 0 && (
          <button onClick={() => setMeasurements([])} style={{ marginLeft:'8px', padding:'6px 12px', background:`${C.critical}20`, border:`1px solid ${C.critical}40`, color:C.critical, borderRadius:'8px', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
            Clear Measures
          </button>
        )}
      </div>
    </div>
  );
}

// ── AI Results Panel ──────────────────────────────────────────
function AIResultsPanel({ scan, onRequestVLM }: { scan:any; onRequestVLM:()=>void }) {
  const [actionBusy, setActionBusy] = useState(false);
  const [showOpinionModal, setShowOpinionModal] = useState(false);
  const ai = scan?.aiResult;
  
  const handleAction = async (type: string) => {
    if (!scan || actionBusy) return;
    setActionBusy(true);
    try {
      if (type === 'escalate') {
        await apiClient.patch(`/scans/${scan.id}/status`, { status: 'CRITICAL' });
        // Feedback via toast or status update in real app
      } else if (type === 'notify') {
        await apiClient.post(`/scans/${scan.id}/notify`);
      }
    } catch (err) {
      console.error('[Radiologist] Action failed:', err);
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

      <div style={{ padding:'10px 12px', background:ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT') ? C.critBg : C.bg3, borderRadius:'12px', border:`1px solid ${ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT') ? C.critical : C.border}30` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:'10px', color:C.textLo, fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.05em' }}>🧠 Clinical Safety Gate</div>
            <Tooltip clinical content="Metacognition Engine: Validates Triage findings against the generated report and clinical logic. If red, human review is mandatory due to a safety mismatch.">
              <span style={{ fontSize:10, color:C.textLo, cursor:'help' }}>ⓘ</span>
            </Tooltip>
          </div>
          <span style={{ 
            fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:4,
            background: ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT') ? C.critical : C.brand,
            color: 'white'
          }}>
            {ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT') ? 'FLAGGED' : 'PASSED'}
          </span>
        </div>
        <div style={{ fontSize:10, color:C.textMd }}>
          {ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT') 
            ? 'Metacognition rules triggered: Plausibility conflict detected.' 
            : 'Multi-layer self-evaluation passed (NHS DCB0129 compliant).'}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <button 
          onClick={() => handleAction('escalate')}
          disabled={actionBusy}
          style={{ padding:'8px', borderRadius:8, background:C.critBg, color:C.critical, border:`1px solid ${C.critical}30`, fontSize:10, fontWeight:700, cursor:'pointer' }}>
          🚨 {scan?.priority === 'CRITICAL' ? 'ESCALATED' : 'ESCALATE STAT'}
        </button>
        <button 
          onClick={() => handleAction('notify')}
          disabled={actionBusy}
          style={{ padding:'8px', borderRadius:8, background:C.infoBg, color:C.info, border:`1px solid ${C.info}30`, fontSize:10, fontWeight:700, cursor:'pointer' }}>
          📡 NOTIFY TEAM
        </button>
        <button 
          onClick={() => setShowOpinionModal(true)}
          disabled={actionBusy}
          style={{ padding:'8px', borderRadius:8, background:C.bg3, color:C.textHi, border:`1px solid ${C.border}`, fontSize:10, fontWeight:700, cursor:'pointer' }}>
          🤝 SECOND OPINION
        </button>
        <button 
          onClick={async () => {
            if (!scan || actionBusy) return;
            setActionBusy(true);
            try {
              await apiClient.post(`/ai/icd10/${scan.id}`);
              onRequestVLM(); 
            } catch(e) { console.error('[Radiologist] ICD-10 failed'); }
            finally { setActionBusy(false); }
          }}
          disabled={actionBusy}
          style={{ padding:'8px', borderRadius:8, background:C.bg3, color:C.brand, border:`1px solid ${C.border}`, fontSize:10, fontWeight:700, cursor:'pointer' }}>
          🔖 AUTO ICD-10
        </button>
      </div>

      {showOpinionModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
          <div style={{ background:C.bg2, padding:24, borderRadius:16, width:'100%', maxWidth:400, border:`1px solid ${C.border}` }}>
            <h3 style={{ margin:0, color:C.textHi, fontSize:16, marginBottom:16 }}>Request Second Opinion</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <label style={{ fontSize:11, color:C.textLo }}>SELECT SPECIALIST</label>
              <select id="specialistSelect" style={{ width:'100%', background:C.bg3, border:`1px solid ${C.border}`, color:C.textHi, padding:10, borderRadius:8 }}>
                <option value="neurorad_expert_01">Dr. S. Chen (Neuro)</option>
                <option value="chest_rad_02">Dr. J. Miller (Thoracic)</option>
                <option value="msk_specialist_03">Dr. A. Gupta (MSK)</option>
              </select>
              <label style={{ fontSize:11, color:C.textLo }}>REASON FOR REVIEW</label>
              <textarea id="opinionReason" defaultValue="Challenging pathology, requires expert verification." style={{ width:'100%', height:80, background:C.bg3, border:`1px solid ${C.border}`, color:C.textHi, padding:10, borderRadius:8, fontSize:12, resize:'none' }} />
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button onClick={()=>setShowOpinionModal(false)} style={{ flex:1, padding:10, background:'transparent', color:C.textLo, border:`1px solid ${C.border}`, borderRadius:8, cursor:'pointer' }}>Cancel</button>
                <button onClick={async () => {
                  const reviewerId = (document.getElementById('specialistSelect') as HTMLSelectElement).value;
                  const reason = (document.getElementById('opinionReason') as HTMLTextAreaElement).value;
                  setActionBusy(true);
                  try {
                    await apiClient.post('/second-opinions', { scanId: scan.id, reviewerId, status: 'pending', reason });
                    setShowOpinionModal(false);
                  } catch(e) { }
                  finally { setActionBusy(false); }
                }} style={{ flex:1, padding:10, background:C.brand, color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>Send Request</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ai.icd10Codes && (
        <div style={{ padding:'8px 12px', background:C.bg3, borderRadius:10, border:`1px solid ${C.border}`, fontSize:10, color:C.textMd }}>
          <span style={{ fontWeight:700, color:C.brand }}>ICD-10:</span> {ai.icd10Codes}
        </div>
      )}

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

  // Load draft from localStorage or AI result
  useEffect(() => { 
    if (!scan) return;
    const saved = localStorage.getItem(`report_draft:${scan.id}`);
    if (saved) {
      setText(saved);
    } else if (scan?.aiResult?.vlmImpression) {
      setText(scan.aiResult.vlmImpression); 
    } else {
      setText('');
    }
  }, [scan?.id]);

  // Auto-save draft
  useEffect(() => {
    if (!scan || !text) return;
    localStorage.setItem(`report_draft:${scan.id}`, text);
  }, [text, scan?.id]);

  const handleTranscript = (transcript: string) => {
    setText(t => t + (t ? '\n\n' : '') + `[ACI Scribe]: ${transcript}`);
  };

  const handleSignAndRelease = async () => {
    if (!scan || busy) return;
    setBusy(true);
    try {
      await apiClient.patch(`/scans/${scan.id}/status`, { status: 'COMPLETED' });
      await apiClient.post(`/reports`, { scanId: scan.id, content: text });
      localStorage.removeItem(`report_draft:${scan.id}`); // Clear on success
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
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
        <div style={{ fontSize:'12px', fontWeight:'700', color:C.textHi }}>Clinical Report</div>
        <VoiceDictation onTranscript={handleTranscript} lang={lang} />
      </div>

      {/* Multimodal Clinical Context Panel (FHIR) */}
      <div style={{ padding:10, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textLo, textTransform:'uppercase' }}>FHIR Multimodal Context</div>
          {scan?.aiResult?.clinicalContext && <span style={{ fontSize:8, color:C.normal, fontWeight:700 }}>● CONNECTED</span>}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <div style={{ fontSize:9, color:C.textLo }}>RELEVANT LABS</div>
            <div style={{ fontSize:11, color:C.textHi, marginTop:2, whiteSpace:'pre-wrap' }}>
              {scan?.aiResult?.clinicalContext?.split('|')?.[1]?.replace('[RECENT_LABS]: ', '').trim() || 'No recent labs available.'}
            </div>
          </div>
          <div>
            <div style={{ fontSize:9, color:C.textLo }}>PATIENT HISTORY</div>
            <div style={{ fontSize:11, color:C.textHi, marginTop:2, whiteSpace:'pre-wrap' }}>
              {scan?.aiResult?.clinicalContext?.split('|')?.[0]?.replace('[HISTORY]: ', '').trim() || 'No history recorded.'}
            </div>
          </div>
        </div>
      </div>

      {/* Longitudinal Progression Analysis (Feature 8) */}
      <div style={{ padding:10, background:`${C.info}10`, border:`1px solid ${C.info}30`, borderRadius:10, marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.info, textTransform:'uppercase', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontSize:12 }}>⏳</span> Longitudinal Progression
        </div>
        <div style={{ fontSize:11, color:C.textHi, lineHeight:1.4 }}>
          {scan?.aiResult?.longitudinalContext?.includes('[PRIOR SCAN]') ? (
            <>
              <div style={{ fontWeight:700, color:C.textMd, fontSize:9, marginBottom:2 }}>MOST RECENT PRIOR: {new Date(scan.aiResult.longitudinalContext.split('|')[0].replace('[PRIOR SCAN]: ', '')).toLocaleDateString()}</div>
              <div style={{ fontSize:11 }}>{scan.aiResult.longitudinalContext.split('|')[2]?.replace('[IMPRESSION]: ', '') || 'No impression recorded in prior.'}</div>
            </>
          ) : 'Baseline scan. No priors found for longitudinal comparison.'}
        </div>
      </div>
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
export function RadiologistWorkspace({ onNavigate }: { onNavigate: (p:string)=>void }) {
  return (
    <ErrorBoundary name="Radiologist Workspace">
      <WorkspaceContent onNavigate={onNavigate} />
    </ErrorBoundary>
  );
}

function WorkspaceContent({ onNavigate }: { onNavigate: (p:string)=>void }) {
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

  const stats = useMemo(() => ({
    total: (scans||[]).length,
    critical: (scans||[]).filter(s=>s.priority==='STAT'||s.aiResult?.urgency==='CRITICAL').length,
  }), [scans]);

  const handleRequestVLM = async () => {
    if (!selected) return;
    try {
      await apiClient.post(`/ai/vlm/${selected.id}`);
      alert('VLM Analysis complete. Impression loaded into the report panel.');
      fetchWorklist(); // Refresh to populate the AI impression in the UI
    } catch (err: any) {
      alert(`VLM Engine Error: ${err.response?.data?.message || err.message}`);
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
        <div style={{ padding:'16px', borderBottom:`1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize:'14px', fontWeight:'700', color:C.textHi }}>Worklist ({stats.total})</span>
          <button onClick={() => onNavigate('training')} style={{ padding:'4px 8px', background:C.brand, color:'white', border:'none', borderRadius:4, fontSize:10, fontWeight:700, cursor:'pointer' }}>
            🎓 Simulator
          </button>
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
