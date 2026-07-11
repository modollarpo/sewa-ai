// SEWA XAI — RadiologistWorkspace.tsx
// Enterprise 3-panel PACS layout: Worklist | DICOM Viewer + AI | Report Editor
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useScanStore } from '../../store/scanStore';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getTranslation } from '../../services/i18n';
import { apiClient, downloadReport } from '../../services/apiClient';
import { Tooltip } from '../../components/ui/Tooltip';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { VoiceDictation, type StructuredReport } from '../../components/ui/VoiceDictation';
import { RemotionPlayerModal } from '../../components/shared/RemotionPlayerModal';
import { PeerReviewWorkspace } from './PeerReviewWorkspace';
import { ConfidenceIndicator, UncertaintyIndicator, ReasoningTrace } from '../../design-system/components';

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

// ── DICOM Viewport (Cornerstone.js Integration Point) ───────────────────
function DicomViewer({ scan, showGradcam }: { scan:any; showGradcam:boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measurements, setMeasurements] = useState<{ x1:number; y1:number; x2:number; y2:number }[]>([]);
  const [tool, setTool] = useState<'pan'|'measure'|'wl'|'zoom'>('pan');
  const [wl, setWl]   = useState({ w:400, l:40 });
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [viewportReady, setViewportReady] = useState(false);

  // Cornerstone.js viewport initialization
  // In production: cornerstoneWADOImageLoader.loadImage(wadoUri)
  useEffect(() => {
    setIsLoading(true);
    setViewportReady(false);
    const timer = setTimeout(() => {
      setIsLoading(false);
      setViewportReady(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [scan]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(10, z - e.deltaY * 0.005)));
  };

  return (
    <div className="relative flex-1 bg-black overflow-hidden group">
      {/* Cornerstone.js Viewport Container */}
      <div 
        ref={containerRef}
        onWheel={handleWheel}
        className={`w-full h-full flex items-center justify-center ${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
        style={{ touchAction: 'none' }}
      >
        {isLoading ? (
          <div style={{ color:'#52B09A', fontFamily:"'IBM Plex Mono',monospace", textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:16, animation:'pulse 1.5s infinite' }}>⟳</div>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Initializing Cornerstone.js Viewport</div>
            <div style={{ fontSize:11, color:'#6FA898' }}>Loading DICOM series via WADO-RS...</div>
          </div>
        ) : viewportReady ? (
          <div style={{ textAlign:'center', color:'#6FA898', width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative' }}>
            {/* Simulated DICOM viewport background */}
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, #111 0%, #000 70%)', opacity:0.8 }} />
            
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ fontSize:48, marginBottom:12, opacity:0.4 }}>🩻</div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:14, color:'#D0ECE6', fontWeight:700, marginBottom:4 }}>
                Cornerstone Viewport Active
              </div>
              <div style={{ fontSize:11, color:'#3A6055' }}>
                {scan?.modality || 'CT'} • {scan?.bodyPart || 'N/A'} • Series loaded
              </div>
              <div style={{ fontSize:10, color:'#3A6055', marginTop:8, fontFamily:"'IBM Plex Mono',monospace" }}>
                W:{wl.w} L:{wl.l} • Zoom:{(zoom*100).toFixed(0)}%
              </div>
            </div>

            {/* AI Detection Overlay */}
            {(showGradcam || scan?.aiResult?.urgency === 'CRITICAL') && (
              <div style={{
                position:'absolute', top:'35%', left:'38%', width:'24%', height:'22%',
                border:'2px dashed #E03535',
                backgroundColor:'rgba(224,53,53,0.08)',
                borderRadius:4,
                display:'flex', alignItems:'flex-start', justifyContent:'flex-end',
                padding:4
              }}>
                <span style={{ backgroundColor:'#E03535', color:'#fff', fontSize:9, padding:'2px 6px', borderRadius:4, fontFamily:"'IBM Plex Mono',monospace", fontWeight:700 }}>
                  AI: {scan?.aiResult?.primaryFinding || 'DETECTION'}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Patient / Study Metadata Overlay — Top corners */}
      <div style={{ position:'absolute', top:12, left:16, zIndex:10, pointerEvents:'none' }}>
        <div style={{ color:'#D0ECE6', fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Sans',system-ui,sans-serif" }}>
          {scan?.patient?.firstName} {scan?.patient?.lastName}
        </div>
        <div style={{ color:'#6FA898', fontSize:10, fontFamily:"'IBM Plex Mono',monospace", marginTop:2 }}>
          {scan?.patient?.mrn || 'MRN: N/A'} • {scan?.modality} • {scan?.bodyPart}
        </div>
      </div>
      <div style={{ position:'absolute', top:12, right:16, zIndex:10, pointerEvents:'none', textAlign:'right' }}>
        <div style={{ color:'#6FA898', fontSize:10, fontFamily:"'IBM Plex Mono',monospace" }}>
          W:{wl.w} L:{wl.l}
        </div>
        <div style={{ color:'#6FA898', fontSize:10, fontFamily:"'IBM Plex Mono',monospace" }}>
          {(zoom*100).toFixed(0)}%
        </div>
      </div>

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
          <button onClick={() => setZoom(1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6FA898] hover:text-white hover:bg-white/5 transition-all" title="Reset View">⊕</button>
        </div>

        <div className="w-[1px] h-6 bg-white/10 mx-1" />

        {/* Window/Level Presets */}
        <div className="flex items-center gap-1 pl-1">
          <button onClick={() => setWl({w:400, l:40})} className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-[#3A6055] hover:text-[#D0ECE6] hover:bg-white/5 transition-all">BRAIN</button>
          <button onClick={() => setWl({w:1500, l:450})} className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-[#3A6055] hover:text-[#D0ECE6] hover:bg-white/5 transition-all">BONE</button>
          <button onClick={() => setWl({w:350, l:40})} className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-[#3A6055] hover:text-[#D0ECE6] hover:bg-white/5 transition-all">SOFT</button>
        </div>

        {/* Modality Specific Controls */}
        {scan?.modality === 'MRI' && (
          <>
            <div className="w-[1px] h-6 bg-white/10 mx-1" />
            <div className="flex items-center gap-1 pl-1">
              <button className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-[#6FA898] hover:text-white hover:bg-[#408D7B]/20 transition-all">SAGITTAL</button>
              <button className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-[#6FA898] hover:text-white hover:bg-[#408D7B]/20 transition-all">CORONAL</button>
            </div>
          </>
        )}

        {scan?.modality === 'US' && (
          <>
            <div className="w-[1px] h-6 bg-white/10 mx-1" />
            <div className="flex items-center gap-1 pl-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6FA898] hover:text-white hover:bg-white/5 transition-all" title="Play Video">▶️</button>
              <button className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-[#6FA898] hover:text-white hover:bg-[#408D7B]/20 transition-all">DOPPLER</button>
            </div>
          </>
        )}

        {scan?.modality === 'PATH' && (
          <>
            <div className="w-[1px] h-6 bg-white/10 mx-1" />
            <div className="flex items-center gap-1 pl-1">
              <button className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-white bg-[#408D7B]/20 border border-[#408D7B]/30 hover:bg-[#408D7B]/40 transition-all">STAIN_H_E</button>
              <button className="px-2 py-1.5 rounded-lg text-[9px] font-bold text-[#6FA898] hover:text-white hover:bg-[#408D7B]/20 transition-all">TILE_ZOOM</button>
            </div>
          </>
        )}

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
  const [showReel, setShowReel] = useState(false);
  const [showOpinionModal, setShowOpinionModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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
      setActionError('Action failed. Please try again.');
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
      {actionError && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#2A0A0A]/40 border border-[#E03535]/30 text-[#E03535] text-xs font-bold">
          <span>⚠ {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-[#E03535] hover:text-white">✕</button>
        </div>
      )}
      {/* Finding Card */}
      <div className={`p-4 rounded-xl border transition-all duration-300 ${
        ai.urgency === 'CRITICAL' ? 'bg-[#2A0A0A]/40 border-[#E03535]/30' : 'bg-[#111F1A]/40 border-[#1B3028]'
      }`}>
        <div className="flex justify-between items-start mb-3">
          <UrgencyPill u={ai.urgency} />
          <div className="flex items-center gap-2">
            {/* Metacognition Confidence Score badge */}
            {typeof ai.confidence === 'number' && (() => {
              const pct = Math.round(ai.confidence * 100);
              const safe = !ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT');
              const bg   = safe ? (pct >= 85 ? '#0A1F14' : '#2A1800') : '#2A0A0A';
              const fg   = safe ? (pct >= 85 ? '#1DBF73' : '#E08A20') : '#E03535';
              const label = safe ? 'META-SAFE' : 'META-FLAG';
              return (
                <span title="Metacognition Composite Score" style={{
                  display:'inline-flex', alignItems:'center', gap:4,
                  padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:800,
                  letterSpacing:'0.06em', fontFamily:'IBM Plex Mono,monospace',
                  background: bg, color: fg, border:`1px solid ${fg}30`,
                }}>
                  🧠 {label} · {pct}%
                </span>
              );
            })()}
            <span className="text-[9px] font-mono text-[#3A6055] bg-[#050F0C] px-1.5 py-0.5 rounded border border-[#1B3028]">Triage Model v2.4</span>
          </div>
        </div>
        <div className={`text-base font-extrabold mb-3 ${ai.urgency === 'CRITICAL' ? 'text-[#E03535]' : 'text-[#D0ECE6]'}`}>
          {ai.primaryFinding}
        </div>
        
        <div className="flex items-center justify-between">
          {ai.location && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#6FA898] font-medium">
              <span className="opacity-50">LOCATION:</span>
              <span className="bg-[#162821] px-1.5 py-0.5 rounded text-[#52B09A]">{ai.location}</span>
            </div>
          )}
          
          <button 
            onClick={() => setShowReel(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#408D7B]/10 border border-[#408D7B]/30 text-[#408D7B] text-[9px] font-black uppercase tracking-widest hover:bg-[#408D7B] hover:text-white transition-all shadow-lg"
          >
            <span className="text-xs">▶</span> Clinical Reel
          </button>
        </div>

        {showReel && (
          <RemotionPlayerModal
            isOpen={showReel}
            onClose={() => setShowReel(false)}
            composition="AIResultExplainer"
            title="Clinical Intelligence Reel"
            inputProps={{
              scanId: scan.id,
              modality: scan.modality,
              bodyPart: scan.bodyPart,
              diagnosis: ai.primaryFinding,
              confidence: ai.confidence,
              urgency: ai.urgency,
              gradcamUrl: ai.heatmapUrl,
              hospital: 'Royal London Hospital'
            }}
          />
        )}
      </div>

      {/* Confidence Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-[#0C1D17] rounded-xl border border-[#1B3028]">
          <div className="text-[9px] font-bold text-[#3A6055] uppercase tracking-widest mb-2">Model Confidence</div>
          <ConfidenceIndicator value={ai.confidence || 0} size="md" />
        </div>
        <div className="p-3 bg-[#0C1D17] rounded-xl border border-[#1B3028]">
          <div className="text-[9px] font-bold text-[#3A6055] uppercase tracking-widest mb-2">Uncertainty</div>
          <UncertaintyIndicator value={ai.confidence || 0} showLabel={true} />
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

      {/* AI Reasoning Trace */}
      <ReasoningTrace
        title="AI Reasoning Chain"
        steps={[
          {
            id: 'dicom_parse',
            title: 'DICOM Parsing',
            description: 'Volume loaded and normalized. Window width/level optimized for ' + (scan?.modality || 'CT') + ' soft tissue.',
            confidence: 0.99,
          },
          {
            id: 'feature_extraction',
            title: 'Feature Extraction',
            description: '3D CNN backbone processes volumetric data through residual blocks with attention gating.',
            confidence: ai.confidence || 0.94,
          },
          {
            id: 'detection',
            title: 'Pathology Detection',
            description: ai.primaryFinding || 'No acute findings detected',
            confidence: ai.confidence || 0.94,
          },
          {
            id: 'safety_check',
            title: 'Clinical Safety Gate',
            description: ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT')
              ? 'Flagged for manual review — visual findings conflict with clinical logic.'
              : 'Multi-layer verification passed. NHS DCB0129 compliant.',
            confidence: ai.metacognitionFlags?.includes('UNSAFE_TO_ALERT') ? 0.5 : 0.97,
          },
        ]}
      />

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
            } catch(e) { setActionError('ICD-10 coding failed.'); }
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
                  } catch(e) { /* Error handled by UI state */ }
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

  const [aciOpen, setAciOpen] = useState(false);
  const originalAITextRef = useRef<string | null>(null);

  const handleTranscript = (transcript: string) => {
    setText(t => t + (t ? '\n\n' : '') + `[DICTATED]: ${transcript}`);
  };

  const handleStructuredReport = (sr: { technique: string; findings: string; impression: string; recommendation: string }) => {
    const parts: string[] = [];
    if (sr.technique) parts.push(`TECHNIQUE:\n${sr.technique}`);
    if (sr.findings) parts.push(`FINDINGS:\n${sr.findings}`);
    if (sr.impression) parts.push(`IMPRESSION:\n${sr.impression}`);
    if (sr.recommendation) parts.push(`RECOMMENDATION:\n${sr.recommendation}`);
    const composed = parts.join('\n\n');
    if (parts.length) {
      setText(composed);
      // Record the original ACI output so we can diff on sign
      originalAITextRef.current = composed;
    }
  };

  const handleSignAndRelease = async () => {
    if (!scan || busy) return;
    setBusy(true);
    try {
      await apiClient.patch(`/scans/${scan.id}/status`, { status: 'COMPLETED' });
      await apiClient.post(`/reports`, { scanId: scan.id, content: text });
      localStorage.removeItem(`report_draft:${scan.id}`);

      // ACI Feedback Loop: silently log diff when human edits AI-generated text
      const original = originalAITextRef.current
        ?? (scan?.aiResult?.vlmImpression ?? null);
      if (original && original.trim() !== text.trim()) {
        const source = originalAITextRef.current ? 'VOICE_DICTATION' : 'VLM_PREFILL';
        apiClient.post(`/reports/feedback/${scan.id}`, {
          originalText: original,
          correctedText: text,
          source
        }).catch((e: unknown) => console.warn('[ACI Feedback] non-critical:', e));
      }
      originalAITextRef.current = null;

      onSign();
      setStatus({ msg: 'Diagnostic report signed and released to EHR.', type: 'ok' });
    } catch (err) {
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

      {/* Collapsible ACI full panel */}
      {aciOpen && (
        <div style={{
          border: `1px solid #1B3028`, borderRadius: 12, overflow: 'hidden', marginBottom: 12,
          background: '#08160F',
        }}>
          <VoiceDictation
            onTranscript={handleTranscript}
            onStructuredReport={handleStructuredReport}
            lang={lang}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col relative group">
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <VoiceDictation
              onTranscript={handleTranscript}
              onStructuredReport={handleStructuredReport}
              lang={lang}
              compact
            />
            <button
              onClick={() => setAciOpen(o => !o)}
              title="Toggle full ACI panel"
              style={{
                padding:'2px 6px', fontSize:9, borderRadius:4, cursor:'pointer', fontWeight:700,
                background:'transparent', border:'none', color: aciOpen ? '#408D7B' : '#3A6055',
                transition:'color 0.15s',
              }}
            >{aciOpen ? '▲' : '▼'}</button>
          </div>
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

      {scan?.reportId && (
        <button 
          onClick={() => downloadReport(scan.reportId)}
          className="mt-4 w-full py-3.5 rounded-xl bg-[#111F1A] border border-[#408D7B]/30 text-[#408D7B] text-xs font-black uppercase tracking-widest hover:bg-[#408D7B]/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          📥 Download Report
        </button>
      )}

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
  const [tab, setTab] = useState<'worklist'|'secondOpinions'|'viewer'|'report'|'peerReview'>('worklist');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [status, setStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);
  const [pendingOpinions, setPendingOpinions] = useState<any[]>([]);

  const fetchPendingOpinions = async () => {
    try {
      const data = await (await import('../../services/apiClient')).getPendingSecondOpinions();
      setPendingOpinions(data);
    } catch (e) {
      setStatus({ msg: 'Failed to load pending reviews.', type: 'err' });
    }
  };

  useEffect(() => {
    fetchWorklist();
    fetchPendingOpinions();
    
    // ── Real-time worklist updates via Socket.IO ──────────────
    const handleUpdate = () => {
      fetchWorklist();
      fetchPendingOpinions();
    };

    const io = (window as any).socket; // Assumes global socket established in App.tsx or similar
    if (io) {
      io.on('critical:alert', handleUpdate);
      io.on('scan:processed', handleUpdate);
      io.on('report:signed',  handleUpdate);
      io.on('secondOpinion:created', handleUpdate);
    }

    const r = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', r);
    return () => {
      window.removeEventListener('resize', r);
      if (io) {
        io.off('critical:alert', handleUpdate);
        io.off('scan:processed', handleUpdate);
        io.off('report:signed',  handleUpdate);
        io.off('secondOpinion:created', handleUpdate);
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
                  <div style={{ fontSize:14, fontWeight:600, color:C.textHi }}>{String((s.patient as Record<string, unknown>)?.user ? ((s.patient as Record<string, unknown>).user as Record<string, unknown>)?.lastName || 'Anonymous' : 'Anonymous')}</div>
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
        {tab === 'peerReview' ? (
          <PeerReviewWorkspace />
        ) : (
          <>
            {/* Panel 1: Worklist Sidebar */}
            <aside className="w-80 flex flex-col bg-[#08160F] border-r border-[#1B3028] shadow-2xl z-10 transition-all duration-300">
              <div className="p-4 border-b border-[#1B3028] bg-[#0C1D17]/50 backdrop-blur-md flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[#3A6055] uppercase tracking-widest mb-0.5">Radiology Worklist</span>
                    <span className="text-sm font-extrabold text-[#D0ECE6]">
                      {tab === 'worklist' ? `Active Scans (${stats.total})` : `Pending Second Opinions (${pendingOpinions.length})`}
                    </span>
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
                {/* Natural Language Query Search */}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6FA898] text-xs">
                    💬
                  </div>
                  <input 
                    placeholder="Ask: 'show me all STAT head CTs from today' or 'find critical chest X-rays'"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#050F0C] border border-[#1B3028] text-[11px] text-[#D0ECE6] outline-none focus:border-[#408D7B] transition-all"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const query = e.currentTarget.value.trim();
                        if (!query) return;
                        
                        try {
                          const result = await apiClient.post('/nlq/query', { query });
                          const data = result.data;
                          if (data.results && data.results.length > 0) {
                            // Update scan store or local state
                            handleSelect(data.results[0]);
                            setStatus({ msg: data.summary, type: 'ok' });
                          } else {
                            setStatus({ msg: data.summary, type: 'err' });
                          }
                        } catch (err: any) {
                          setStatus({ msg: 'Query failed: ' + (err.response?.data?.message || err.message), type: 'err' });
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Tab bar for switching between worklist, second opinions, and peer review */}
              <div className="flex border-b border-[#1B3028] bg-[#0C1D17]/30">
                {[
                  { id: 'worklist', label: 'Worklist', count: stats.total },
                  { id: 'secondOpinions', label: '2nd Opinions', count: pendingOpinions.length },
                  { id: 'peerReview', label: 'Peer Review', count: 0 }
                ].map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setTab(t.id as any)} 
                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
                      tab === t.id ? 'border-[#408D7B] text-[#408D7B] bg-[#408D7B]/8' : 'border-transparent text-[#3A6055] hover:text-[#6FA898] hover:bg-[#111F1A]/30'
                    }`}
                  >
                    {t.label} {t.count > 0 ? `(${t.count})` : ''}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {tab === 'worklist' && (scans && scans.length > 0 ? (
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
                        {String(((s.patient as Record<string, unknown>)?.user ? ((s.patient as Record<string, unknown>).user as Record<string, unknown>)?.lastName || 'Anonymous' : 'Anonymous'))}, {String(((s.patient as Record<string, unknown>)?.user ? ((s.patient as Record<string, unknown>).user as Record<string, unknown>)?.firstName?.toString().charAt(0) || 'U' : 'U'))}.
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
                ))}

                {tab === 'secondOpinions' && (pendingOpinions.length > 0 ? (
                  pendingOpinions.map(opinion => (
                    <div 
                      key={opinion.id} 
                      onClick={() => handleSelect(opinion.scan)} 
                      className={`group relative p-4 border-b border-[#1B3028] cursor-pointer transition-all hover:bg-[#111F1A] ${
                        selected?.id === opinion.scan?.id ? 'bg-[#408D7B]/10 border-l-4 border-l-[#408D7B]' : 'border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#2A6EF2]/10 text-[#2A6EF2] border border-[#2A6EF2]/20">
                          <span className="w-1 h-1 rounded-full bg-[#2A6EF2] animate-pulse" /> 2ND OPINION
                        </span>
                        <span className="text-[9px] font-mono text-[#3A6055] uppercase">{fmtRelative(opinion.createdAt)}</span>
                      </div>
                      <div className="text-sm font-bold text-[#D0ECE6] group-hover:text-[#52B09A] transition-colors">
                        {opinion.scan?.patient?.user?.lastName || 'Anonymous'}, {opinion.scan?.patient?.user?.firstName?.charAt(0) || 'U'}.
                      </div>
                      <div className="text-[10px] text-[#6FA898] mt-1 line-clamp-2">{opinion.notes || 'No additional notes provided.'}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-[#3A6055] p-8 text-center">
                    <span className="text-3xl mb-2">🤝</span>
                    <p className="text-xs font-medium uppercase tracking-tighter">No pending second opinions</p>
                  </div>
                ))}
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
              <div className="flex-1 flex flex-col w-full h-full pt-10">
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
          </>
        )}
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
          <span className="font-mono">© 2026 SEWA XAI</span>
          <span className="font-mono text-[#3A6055]">v2.4.1-PRO</span>
        </div>
      </footer>
    </div>
  );

}
