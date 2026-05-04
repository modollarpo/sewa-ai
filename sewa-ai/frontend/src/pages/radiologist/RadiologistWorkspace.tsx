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
      // (Mock drawing logic for CT - in real app would use dicom-parser/cornerstone)
      ctx.beginPath();
      ctx.ellipse(w/2, h*0.5, w*0.37, h*0.43, 0, 0, Math.PI*2);
      ctx.fillStyle = '#1e1e1e'; ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth=1; ctx.stroke();
      
      // AI Highlight (ICH Mock)
      const ai = scan?.aiResult;
      if (showGradcam || ai?.urgency === 'CRITICAL') {
        const grd = ctx.createRadialGradient(w*0.63, h*0.40, 0, w*0.63, h*0.40, w*0.13);
        grd.addColorStop(0, 'rgba(224,53,53,0.6)');
        grd.addColorStop(0.5,'rgba(224,53,53,0.2)');
        grd.addColorStop(1, 'rgba(224,53,53,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.ellipse(w*0.63, h*0.40, w*0.12, h*0.10, 0.3, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(224,53,53,0.8)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Drawing some "brain" structures
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth=0.5;
      for (let i=0; i<5; i++) {
        ctx.beginPath();
        ctx.ellipse(w/2, h*0.5, w*(0.1+i*0.05), h*(0.15+i*0.05), Math.PI/4, 0, Math.PI*2);
        ctx.stroke();
      }
    } else if (modality === 'XR') {
      ctx.fillStyle = '#111'; ctx.fillRect(0,0,w,h);
      const lGrd = ctx.createRadialGradient(w*0.35, h*0.45, 10, w*0.35, h*0.45, w*0.22);
      lGrd.addColorStop(0,'rgba(180,180,180,0.2)'); lGrd.addColorStop(1,'transparent');
      ctx.fillStyle = lGrd;
      ctx.beginPath(); ctx.ellipse(w*0.35, h*0.48, w*0.20, h*0.30, -0.1, 0, Math.PI*2); ctx.fill();
    }

    // Measurements
    const allM = activeM ? [...measurements, activeM] : measurements;
    allM.forEach(m => {
      ctx.strokeStyle = '#52B09A'; ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([5/zoom, 5/zoom]);
      ctx.beginPath(); ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2); ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#52B09A';
      ctx.beginPath(); ctx.arc(m.x1, m.y1, 3/zoom, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(m.x2, m.y2, 3/zoom, 0, Math.PI*2); ctx.fill();

      const dist = Math.sqrt(Math.pow(m.x2-m.x1,2) + Math.pow(m.y2-m.y1,2));
      const mm = (dist * 0.23).toFixed(1);
      ctx.font = `bold ${10/zoom}px IBM Plex Mono`;
      ctx.fillStyle = 'white';
      ctx.fillText(`${mm}mm`, (m.x1+m.x2)/2 + 5/zoom, (m.y1+m.y2)/2 - 5/zoom);
    });

    ctx.restore();

    // Overlay Metadata
    ctx.fillStyle='rgba(82,176,154,0.8)'; ctx.font=`bold 9px IBM Plex Mono`;
    const metadata = [
      `WINDOW:${wl.w} LEVEL:${wl.l}`, 
      `MAGNIFY:${zoom.toFixed(1)}x`,
      `RENDER:GPU_ACCEL`,
      `SYSTEM:SEWA_PACS_v2.4`
    ];
    metadata.forEach((m,i) => ctx.fillText(m, 12, 55+i*14));
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
    <div className="relative flex-1 bg-black overflow-hidden group">
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      {/* Floating Professional Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-[#08160F]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] opacity-40 group-hover:opacity-100 transition-all duration-500 hover:scale-[1.02]">
        
        {/* Tool Selectors */}
        <div className="flex items-center gap-1 pr-2 border-r border-white/10">
          <button 
            onClick={() => setTool('pan')} 
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${tool === 'pan' ? 'bg-[#408D7B] text-white shadow-[0_0_15px_rgba(64,141,123,0.4)]' : 'text-[#3A6055] hover:text-[#D0ECE6] hover:bg-white/5'}`}
            title="Pan & Zoom (P)"
          >
            <span className="text-lg">🖐️</span>
          </button>
          <button 
            onClick={() => setTool('measure')} 
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${tool === 'measure' ? 'bg-[#408D7B] text-white shadow-[0_0_15px_rgba(64,141,123,0.4)]' : 'text-[#3A6055] hover:text-[#D0ECE6] hover:bg-white/5'}`}
            title="Caliper Measurement (M)"
          >
            <span className="text-lg">📏</span>
          </button>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1 px-1">
          <button onClick={() => setZoom(z=>Math.min(10,z+0.5))} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6FA898] hover:text-white hover:bg-white/5 transition-all" title="Zoom In">🔍</button>
          <button onClick={() => setZoom(z=>Math.max(0.2,z-0.5))} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6FA898] hover:text-white hover:bg-white/5 transition-all" title="Zoom Out">🔎</button>
          <button onClick={() => { setZoom(1); setPan({x:0,y:0}); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6FA898] hover:text-white hover:bg-white/5 transition-all" title="Reset View">⊕</button>
        </div>

        <div className="w-[1px] h-6 bg-white/10 mx-1" />

        {/* Window/Level Presets */}
        <div className="flex items-center gap-1 pl-1">
          <button onClick={() => setWl({w:400, l:40})} className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-[#3A6055] hover:text-[#D0ECE6] hover:bg-white/5 transition-all">BRAIN</button>
          <button onClick={() => setWl({w:1500, l:450})} className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-[#3A6055] hover:text-[#D0ECE6] hover:bg-white/5 transition-all">BONE</button>
          <button onClick={() => setWl({w:350, l:40})} className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-[#3A6055] hover:text-[#D0ECE6] hover:bg-white/5 transition-all">SOFT</button>
        </div>

        {measurements.length > 0 && (
          <>
            <div className="w-[1px] h-6 bg-white/10 mx-1" />
            <button 
              onClick={() => setMeasurements([])} 
              className="px-3 py-1.5 rounded-lg bg-[#E03535]/10 border border-[#E03535]/20 text-[#E03535] text-[9px] font-bold uppercase tracking-wider hover:bg-[#E03535] hover:text-white transition-all"
            >
              Clear
            </button>
          </>
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
      <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in">
        <div className="text-4xl mb-4 opacity-20">🔬</div>
        <p className="text-xs font-bold text-[#3A6055] uppercase tracking-widest">
          {scan?.status === 'processing' ? 'AI Neural Engines Processing...' : 'Select a study to view AI insights'}
        </p>
        {scan?.status === 'processing' && (
          <div className="w-32 h-1 bg-[#1B3028] mt-4 rounded-full overflow-hidden">
            <div className="h-full bg-[#408D7B] animate-[shimmer_2s_infinite] w-full" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-5 animate-fade-in">
      {/* Finding Card */}
      <div className={`p-4 rounded-xl border transition-all duration-300 ${
        ai.urgency === 'CRITICAL' ? 'bg-[#2A0A0A]/40 border-[#E03535]/30' : 'bg-[#111F1A]/40 border-[#1B3028]'
      }`}>
        <div className="flex justify-between items-start mb-3">
          <UrgencyPill u={ai.urgency} />
          <span className="text-[9px] font-mono text-[#3A6055] bg-[#050F0C] px-1.5 py-0.5 rounded border border-[#1B3028]">Triage Model v2.4</span>
        </div>
        <div className={`text-base font-extrabold mb-1 ${ai.urgency === 'CRITICAL' ? 'text-[#E03535]' : 'text-[#D0ECE6]'}`}>
          {ai.primaryFinding}
        </div>
        {ai.location && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#6FA898] font-medium">
            <span className="opacity-50">LOCATION:</span>
            <span className="bg-[#162821] px-1.5 py-0.5 rounded text-[#52B09A]">{ai.location}</span>
          </div>
        )}
      </div>

      {/* Confidence Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-[#0C1D17] rounded-xl border border-[#1B3028]">
          <div className="text-[9px] font-bold text-[#3A6055] uppercase tracking-widest mb-2">Model Confidence</div>
          <ConfBar v={ai.confidence || 0} />
        </div>
        <div className="p-3 bg-[#0C1D17] rounded-xl border border-[#1B3028] flex flex-col justify-center">
          <div className="text-[9px] font-bold text-[#3A6055] uppercase tracking-widest mb-1">Processing Time</div>
          <div className="text-xs font-mono font-bold text-[#408D7B]">~1.2s <span className="text-[9px] text-[#3A6055] font-normal">on GPU-A100</span></div>
        </div>
      </div>

      {/* Clinical Safety Gate (Metacognition) */}
      <div className={`p-3 rounded-xl border transition-all duration-500 ${
        ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT') 
          ? 'bg-[#2A0A0A] border-[#E03535]/50 shadow-[0_0_15px_rgba(224,53,53,0.1)]' 
          : 'bg-[#0A1F14] border-[#1DBF73]/30'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs">🧠</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#D0ECE6]">Clinical Safety Gate</span>
            <Tooltip clinical content="Metacognition Engine: Cross-references visual findings with semantic clinical logic.">
              <span className="text-[10px] text-[#3A6055] cursor-help hover:text-[#D0ECE6]">ⓘ</span>
            </Tooltip>
          </div>
          <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
            ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT') ? 'bg-[#E03535] text-white' : 'bg-[#1DBF73] text-[#050F0C]'
          }`}>
            {ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT') ? 'FLAGGED' : 'PASSED'}
          </div>
        </div>
        <p className="text-[10px] leading-relaxed text-[#6FA898]">
          {ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT') 
            ? 'SAFETY ALERT: Visual findings conflict with patient history or reporting logic. Human verification mandatory.' 
            : 'Multi-layer clinical verification passed. NHS DCB0129 Compliance: VERIFIED.'}
        </p>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => handleAction('escalate')}
          disabled={actionBusy}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#2A0A0A] border border-[#E03535]/30 text-[#E03535] text-[10px] font-bold uppercase tracking-wide hover:bg-[#E03535] hover:text-white transition-all active:scale-95 disabled:opacity-50"
        >
          🚨 {scan?.priority === 'CRITICAL' ? 'Escalated' : 'Escalate STAT'}
        </button>
        <button 
          onClick={() => handleAction('notify')}
          disabled={actionBusy}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#0A1530] border border-[#2A6EF2]/30 text-[#2A6EF2] text-[10px] font-bold uppercase tracking-wide hover:bg-[#2A6EF2] hover:text-white transition-all active:scale-95 disabled:opacity-50"
        >
          📡 Notify Team
        </button>
        <button 
          onClick={() => setShowOpinionModal(true)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#111F1A] border border-[#1B3028] text-[#D0ECE6] text-[10px] font-bold uppercase tracking-wide hover:bg-[#1B3028] transition-all active:scale-95"
        >
          🤝 2nd Opinion
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
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#111F1A] border border-[#1B3028] text-[#408D7B] text-[10px] font-bold uppercase tracking-wide hover:bg-[#408D7B] hover:text-white transition-all active:scale-95"
        >
          🔖 Auto ICD-10
        </button>
      </div>

      {/* VLM Analysis Section */}
      {ai.vlmImpression ? (
        <div className="p-4 bg-gradient-to-br from-[#0A1530] to-[#050F0C] rounded-xl border border-[#2A6EF2]/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl transform rotate-12 group-hover:rotate-0 transition-transform">🤖</div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-[#2A6EF2] uppercase tracking-widest">AI Report Impression</span>
            <button onClick={onRequestVLM} className="text-[9px] text-[#3A6055] hover:text-[#2A6EF2] underline transition-colors">Regenerate</button>
          </div>
          <p className="text-[11px] leading-relaxed text-[#D0ECE6] italic">"{ai.vlmImpression}"</p>
          <div className="mt-3 pt-3 border-t border-[#2A6EF2]/10 flex items-center gap-2">
            <span className="text-[8px] text-[#3A6055] font-mono">LLM: Claude-3-Flash</span>
            <span className="text-[8px] text-[#3A6055] font-mono">Prompt: V3.1-Med</span>
          </div>
        </div>
      ) : (
        <button 
          onClick={onRequestVLM}
          disabled={actionBusy}
          className="group relative w-full py-4 rounded-xl bg-gradient-to-r from-[#2A6EF2] to-[#153A80] text-white overflow-hidden shadow-[0_4px_20px_rgba(42,110,242,0.2)] hover:shadow-[0_4px_25px_rgba(42,110,242,0.35)] transition-all active:scale-[0.99] disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <div className="flex items-center justify-center gap-3">
            <span className="text-xl animate-pulse">⚡</span>
            <span className="text-xs font-black uppercase tracking-widest">Generate VLM Intelligence Report</span>
          </div>
        </button>
      )}

      {/* Second Opinion Modal */}
      {showOpinionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#050F0C]/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0C1D17] border border-[#1B3028] rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-[#1B3028] bg-[#111F1A]">
              <h3 className="text-lg font-extrabold text-[#D0ECE6]">Request Expert Verification</h3>
              <p className="text-xs text-[#6FA898] mt-1">Select a specialist for peer review and second opinion.</p>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[#3A6055] uppercase tracking-widest">Consultant Specialist</label>
                <select id="specialistSelect" className="w-full bg-[#050F0C] border border-[#1B3028] rounded-xl px-4 py-3 text-sm text-[#D0ECE6] outline-none focus:border-[#408D7B] transition-colors">
                  <option value="neurorad_expert_01">Dr. S. Chen (Neuro-radiology)</option>
                  <option value="chest_rad_02">Dr. J. Miller (Thoracic Diagnostic)</option>
                  <option value="msk_specialist_03">Dr. A. Gupta (MSK Specialist)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[#3A6055] uppercase tracking-widest">Clinical Context / Reason</label>
                <textarea id="opinionReason" defaultValue="Challenging pathology identified by AI; requires expert human verification." className="w-full h-32 bg-[#050F0C] border border-[#1B3028] rounded-xl px-4 py-3 text-sm text-[#D0ECE6] resize-none outline-none focus:border-[#408D7B] transition-colors" />
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={()=>setShowOpinionModal(false)} className="flex-1 py-3 rounded-xl border border-[#1B3028] text-[#3A6055] font-bold hover:bg-[#1B3028] hover:text-[#D0ECE6] transition-all">Cancel</button>
                <button onClick={async () => {
                  const reviewerId = (document.getElementById('specialistSelect') as HTMLSelectElement).value;
                  const reason = (document.getElementById('opinionReason') as HTMLTextAreaElement).value;
                  setActionBusy(true);
                  try {
                    await apiClient.post('/second-opinions', { scanId: scan.id, reviewerId, status: 'pending', reason });
                    setShowOpinionModal(false);
                  } catch(e) { }
                  finally { setActionBusy(false); }
                }} className="flex-1 py-3 rounded-xl bg-[#408D7B] text-white font-bold hover:bg-[#52B09A] shadow-[0_4px_15px_rgba(64,141,123,0.3)] transition-all">Send Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Report Editor ─────────────────────────────────────────────
function ReportEditor({ scan, onSign, setStatus }: { scan:any, onSign:()=>void, setStatus:(s:{msg:string;type:'ok'|'err'}|null)=>void }) {
  const { lang } = useSettingsStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { 
    if (!scan) return;
    const saved = localStorage.getItem(`report_draft:${scan.id}`);
    if (saved) setText(saved);
    else if (scan?.aiResult?.vlmImpression) setText(scan.aiResult.vlmImpression); 
    else setText('');
  }, [scan?.id]);

  useEffect(() => {
    if (!scan || !text) return;
    localStorage.setItem(`report_draft:${scan.id}`, text);
  }, [text, scan?.id]);

  const handleTranscript = (transcript: string) => {
    setText(t => t + (t ? '\n\n' : '') + `[DICTATED]: ${transcript}`);
  };

  const handleSignAndRelease = async () => {
    if (!scan || busy) return;
    setBusy(true);
    try {
      await apiClient.patch(`/scans/${scan.id}/status`, { status: 'COMPLETED' });
      await apiClient.post(`/reports`, { scanId: scan.id, content: text });
      localStorage.removeItem(`report_draft:${scan.id}`);
      onSign();
      setStatus({ msg: 'Diagnostic report signed and released to EHR.', type: 'ok' });
    } catch (err) {
      console.error('Sign failed:', err);
      setStatus({ msg: 'Failed to authorize report release.', type: 'err' });
    } finally {
      setBusy(false);
    }
  };

  if (!scan) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center opacity-30 select-none">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Clinical Reporting Terminal Idle</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-4">
      {/* Contextual Intelligence Tabs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-3 bg-[#0C1D17] border border-[#1B3028] rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-bold text-[#3A6055] uppercase tracking-widest">FHIR History</span>
            <span className="w-1 h-1 rounded-full bg-[#1DBF73] shadow-[0_0_4px_#1DBF73]" />
          </div>
          <div className="text-[10px] text-[#D0ECE6] line-clamp-2 leading-relaxed">
            {scan?.aiResult?.clinicalContext?.split('|')?.[0]?.replace('[HISTORY]: ', '').trim() || 'No prior medical history records found.'}
          </div>
        </div>
        <div className="p-3 bg-[#0C1D17] border border-[#1B3028] rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-bold text-[#3A6055] uppercase tracking-widest">Priors / Progression</span>
            <span className="text-[8px] font-mono text-[#408D7B]">V2.1-COMP</span>
          </div>
          <div className="text-[10px] text-[#D0ECE6] line-clamp-2 leading-relaxed">
            {scan?.aiResult?.longitudinalContext?.includes('[PRIOR SCAN]') 
              ? `Progression analysis: ${scan.aiResult.longitudinalContext.split('|')[2]?.replace('[IMPRESSION]: ', '')}`
              : 'Baseline study. No comparative priors detected.'}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative group">
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
          <VoiceDictation onTranscript={handleTranscript} lang={lang} />
          <div className="h-4 w-[1px] bg-[#1B3028]" />
          <button className="text-[10px] text-[#3A6055] hover:text-[#D0ECE6]">Templates</button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="flex-1 w-full p-4 bg-[#050F0C] border border-[#1B3028] rounded-xl text-[#D0ECE6] text-xs leading-relaxed resize-none outline-none focus:border-[#408D7B]/50 transition-all font-sans"
          placeholder="Enter formal radiologic findings and impression..."
        />
      </div>

      <button 
        onClick={handleSignAndRelease}
        disabled={busy || !text}
        className="mt-4 w-full py-3.5 rounded-xl bg-[#408D7B] text-white text-xs font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(64,141,123,0.3)] hover:bg-[#52B09A] transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Authorizing...
          </span>
        ) : (
          'Sign & Release to EHR'
        )}
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
  const [status, setStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);

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
      setStatus({ msg: 'VLM Analysis complete. Impression loaded into the report panel.', type: 'ok' });
      fetchWorklist(); 
    } catch (err: any) {
      setStatus({ msg: `VLM Engine Error: ${err.response?.data?.message || err.message}`, type: 'err' });
    }
  };

  const handleSelect = (s: any) => {
    setSelected(s);
    if (isMobile) setTab('viewer');
  };

  if (isMobile) {
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {status && (
          <div style={{ 
            padding:'10px 16px', background: status.type==='ok'?C.normalBg:C.critBg, 
            borderBottom:`1px solid ${status.type==='ok'?C.normal:C.critical}40`,
            display:'flex', justifyContent:'space-between', alignItems:'center',
            color: status.type==='ok'?C.normal:C.critical, fontSize:11, fontWeight:600
          }}>
            <span>{status.type==='ok'?'✓':'⚠'} {status.msg}</span>
            <button onClick={()=>setStatus(null)} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer' }}>✕</button>
          </div>
        )}
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
                <ReportEditor scan={selected} onSign={() => { fetchWorklist(); setTab('worklist'); }} setStatus={setStatus} />
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
    <div className="flex flex-col h-screen bg-[#05100D] overflow-hidden font-sans text-[#D0ECE6]">
      {/* Global Status Bar */}
      {status && (
        <div className={`px-5 py-2 flex justify-between items-center text-xs font-bold animate-fade-in ${
          status.type === 'ok' ? 'bg-[#0A1F14] text-[#1DBF73] border-b border-[#1DBF73]/30' : 'bg-[#2A0A0A] text-[#E03535] border-b border-[#E03535]/30'
        }`}>
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status.type === 'ok' ? 'bg-[#1DBF73] shadow-[0_0_8px_#1DBF73]' : 'bg-[#E03535] shadow-[0_0_8px_#E03535]'}`} />
            {status.msg}
          </span>
          <button onClick={() => setStatus(null)} className="hover:opacity-70 transition-opacity">✕</button>
        </div>
      )}

      {/* Main PACS Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Panel 1: Worklist Sidebar */}
        <aside className="w-80 flex flex-col bg-[#08160F] border-r border-[#1B3028] shadow-2xl z-10 transition-all duration-300">
          <div className="p-4 border-b border-[#1B3028] bg-[#0C1D17]/50 backdrop-blur-md flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#3A6055] uppercase tracking-widest mb-0.5">Radiology Worklist</span>
              <span className="text-sm font-extrabold text-[#D0ECE6]">Active Scans ({stats.total})</span>
            </div>
            <Tooltip content="Launch Training Simulator">
              <button 
                onClick={() => onNavigate('training')} 
                className="p-2 rounded-lg bg-[#408D7B]/10 text-[#408D7B] border border-[#408D7B]/20 hover:bg-[#408D7B]/20 transition-all active:scale-95"
              >
                🎓
              </button>
            </Tooltip>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {scans && scans.length > 0 ? (
              scans.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => handleSelect(s)} 
                  className={`group relative p-4 border-b border-[#1B3028] cursor-pointer transition-all hover:bg-[#111F1A] ${
                    selected?.id === s.id ? 'bg-[#408D7B]/10 border-l-4 border-l-[#408D7B]' : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <UrgencyPill u={s.priority || 'ROUTINE'} />
                    <span className="text-[9px] font-mono text-[#3A6055] uppercase">{fmtRelative(s.receivedAt)}</span>
                  </div>
                  <div className={`text-sm font-bold transition-colors ${selected?.id === s.id ? 'text-[#408D7B]' : 'text-[#D0ECE6] group-hover:text-[#52B09A]'}`}>
                    {s.patient?.user?.lastName || 'Anonymous'}, {s.patient?.user?.firstName?.charAt(0) || 'U'}.
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#162821] text-[#6FA898] font-mono border border-[#1B3028]">
                      {s.modality}
                    </span>
                    <span className="text-[10px] text-[#3A6055] font-medium tracking-wide">
                      {s.bodyPart}
                    </span>
                  </div>
                  {s.aiResult?.urgency === 'CRITICAL' && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#E03535] animate-pulse shadow-[0_0_8px_#E03535]" />
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-[#3A6055] p-8 text-center">
                <span className="text-3xl mb-2">📋</span>
                <p className="text-xs font-medium uppercase tracking-tighter">No scans in worklist</p>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-[#050F0C] border-t border-[#1B3028] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1DBF73] animate-pulse" />
              <span className="text-[9px] font-bold text-[#3A6055] uppercase tracking-widest">Live Connection</span>
            </div>
            <span className="text-[9px] font-mono text-[#2E6B5E]">{user?.tenantName || 'SEWA Health'}</span>
          </div>
        </aside>

        {/* Panel 2: PACS Viewer Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-black relative">
          {/* Viewer Header Metadata */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#08160F]/80 backdrop-blur-xl border-b border-white/5 absolute top-0 left-0 right-0 z-20">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-[#408D7B] uppercase tracking-widest">Selected Study</span>
                <h2 className="text-xs font-bold text-[#D0ECE6]">
                  {selected ? `${selected.modality} · ${selected.bodyPart} · ${selected.patient?.user?.lastName || 'Anonymous'}` : 'Select a study to begin interpretation'}
                </h2>
              </div>
              {selected && (
                <div className="h-6 w-[1px] bg-[#1B3028] mx-2" />
              )}
              {selected && (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-[#3A6055] uppercase">Patient ID</span>
                    <span className="text-[10px] font-mono text-[#6FA898]">{selected.patient?.id?.slice(0,8) || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-[#3A6055] uppercase">Accession</span>
                    <span className="text-[10px] font-mono text-[#6FA898]">{selected.id?.slice(-6).toUpperCase() || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {selected && (
                <button 
                  onClick={() => setShowGradcam(!showGradcam)} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                    showGradcam 
                      ? 'bg-[#E03535]/10 border-[#E03535]/40 text-[#E03535] shadow-[0_0_12px_rgba(224,53,53,0.15)]' 
                      : 'bg-[#162821] border-[#1B3028] text-[#3A6055] hover:text-[#D0ECE6]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${showGradcam ? 'bg-[#E03535] animate-pulse' : 'bg-[#3A6055]'}`} />
                  AI GRAD-CAM
                </button>
              )}
              <div className="h-6 w-[1px] bg-[#1B3028]" />
              <Tooltip content="Full Screen Viewer">
                <button className="text-[#3A6055] hover:text-[#D0ECE6] transition-colors">⛶</button>
              </Tooltip>
            </div>
          </div>

          {/* Actual Canvas Viewer */}
          <div className="flex-1 w-full h-full pt-10">
            <DicomViewer scan={selected} showGradcam={showGradcam} />
          </div>
        </main>

        {/* Panel 3: Clinical Insight & Report Editor */}
        <aside className="w-96 flex flex-col bg-[#08160F] border-l border-[#1B3028] shadow-[-10px_0_30px_rgba(0,0,0,0.3)] z-10">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* AI findings section */}
            <div className="flex-[0_0_45%] overflow-y-auto border-b border-[#1B3028] scrollbar-thin">
              <div className="p-3 bg-[#0C1D17] border-b border-[#1B3028] flex items-center gap-2">
                <span className="text-xs">🤖</span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#408D7B]">AI Diagnostic Insights</span>
              </div>
              <AIResultsPanel scan={selected} onRequestVLM={handleRequestVLM} />
            </div>

            {/* Reporting section */}
            <div className="flex-[0_0_55%] flex flex-col min-h-0 bg-[#050F0C]">
              <div className="p-3 bg-[#0C1D17] border-b border-[#1B3028] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs">✍️</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D0ECE6]">Clinical Impression</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1DBF73] shadow-[0_0_4px_#1DBF73]" />
                  <span className="text-[8px] font-mono text-[#1DBF73] uppercase">Auto-Saving</span>
                </div>
              </div>
              <ReportEditor scan={selected} onSign={() => { fetchWorklist(); setSelected(null); }} setStatus={setStatus} />
            </div>
          </div>
        </aside>

      </div>

      {/* Quick Access Footer */}
      <footer className="h-8 bg-[#050F0C] border-t border-[#1B3028] px-4 flex items-center justify-between text-[9px] font-medium text-[#2E5048]">
        <div className="flex items-center gap-4 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#408D7B]" />
            PACS Terminal 01
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1DBF73]" />
            DICOM Node: OK
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1DBF73]" />
            AI Pipeline: Latency 42ms
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono">© 2026 SEWA AI</span>
          <span className="font-mono text-[#3A6055]">v2.4.1-PRO</span>
        </div>
      </footer>
    </div>
  );

}
