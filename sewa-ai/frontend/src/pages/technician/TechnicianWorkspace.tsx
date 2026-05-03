// SEWA AI — TechnicianWorkspace.tsx
// DICOM upload (drag-drop), live worklist, PACS sync status, queue management
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTechnicianData, useAppointmentData } from '../../hooks/useDashboardData';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Tooltip } from '../../components/ui/Tooltip';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A', bg4:'#162821',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', critBg:'#2A0A0A',
  urgent:'#E08A20', urgBg:'#2A1800',
  normal:'#1DBF73', normalBg:'#0A1F14',
  info:'#2A6EF2', infoBg:'#0B162C',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

const MODALITIES = ['CT','MRI','XR','US','NM','PET','MG','CR'];
const BODY_PARTS = ['HEAD','CHEST','ABDOMEN','PELVIS','SPINE','NECK','EXTREMITY','WHOLE_BODY'];
const PRIORITIES = ['ROUTINE','URGENT','STAT'];

interface UploadJob {
  id: string;
  filename: string;
  modality: string;
  bodyPart: string;
  priority: string;
  status: 'queued' | 'uploading' | 'processing' | 'ai_complete' | 'error';
  progress: number;
  error?: string;
  urgency?: string;
  finding?: string;
  confidence?: number;
  scanId?: string;
  startedAt: number;
}

// Fallbacks handled in hook

function StatusBadge({ status, progress }: { status: string; progress: number }) {
  const cfg: Record<string,[string,string,string]> = {
    queued:      [C.textLo,    C.bg3,       C.border],
    uploading:   [C.info,      C.infoBg,    '#152040'],
    processing:  [C.brand,     `${C.brand}14`, `${C.brand}30`],
    ai_complete: [C.normal,    C.normalBg,  '#0D2A1A'],
    error:       [C.critical,  C.critBg,    '#4A1515'],
  };
  const [color, bg, border] = cfg[status] ?? cfg.queued;
  const labels: Record<string,string> = {
    queued:'Queued', uploading:`Uploading ${progress}%`, processing:'AI Processing',
    ai_complete:'✓ Complete', error:'Error',
  };
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:20,
      fontSize:10,fontWeight:700,background:bg,color,border:`1px solid ${border}`,fontFamily:C.F,letterSpacing:'0.04em',whiteSpace:'nowrap'}}>
      {status==='uploading'||status==='processing' ? (
        <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          style={{animation:'spin 0.8s linear infinite'}}>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <circle cx={12} cy={12} r={10} strokeOpacity={0.25}/><path d="M12 2a10 10 0 0 1 10 10"/>
        </svg>
      ) : (
        <span style={{width:5,height:5,borderRadius:'50%',background:color,flexShrink:0}}/>
      )}
      {labels[status]}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const m: Record<string,[string,string]> = {
    CRITICAL:[C.critical, C.critBg],
    URGENT:[C.urgent, C.urgBg],
    NORMAL:[C.normal, C.normalBg],
    ROUTINE:[C.textLo, C.bg3],
  };
  const [color, bg] = m[(urgency||'ROUTINE').toUpperCase()] ?? m.ROUTINE;
  return (
    <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:bg,color,fontFamily:C.F}}>
      {urgency}
    </span>
  );
}

function ScheduleView() {
  const { appointments, loading } = useAppointmentData();
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:C.textHi}}>Scanner Throughput</div>
          <div style={{fontSize:11,color:C.textMd}}>Daily schedule for MRI-01 and CT-02</div>
        </div>
        <span style={{fontSize:11,color:C.textLo}}>{new Date().toLocaleDateString()}</span>
      </div>
      
      {loading ? (
        <div style={{padding:40,textAlign:'center',color:C.textLo}}>Loading schedule...</div>
      ) : appointments.length === 0 ? (
        <div style={{padding:40,textAlign:'center',background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,color:C.textLo}}>
          No scans scheduled for today.
        </div>
      ) : appointments.map((a: any) => (
        <div key={a.id} style={{padding:14,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,textAlign:'center',borderRight:`1px solid ${C.border}`,paddingRight:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.brand,fontFamily:C.FM}}>{new Date(a.scheduledDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:C.textHi}}>{a.patient?.name || 'Unknown Patient'}</div>
            <div style={{fontSize:11,color:C.textLo}}>{a.type.replace(/_/g,' ').toUpperCase()} · Ref: Dr. {a.doctor?.lastName || 'Anon'}</div>
          </div>
          <span style={{padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:700,background:a.status==='completed'?C.normalBg:C.bg3,color:a.status==='completed'?C.normal:C.textMd,border:`1px solid ${a.status==='completed'?'#0D2A1A':C.border}`}}>
            {a.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TechnicianWorkspace() {
  const { user } = useAuthStore();
  const { worklist, loading } = useTechnicianData();
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  useEffect(() => {
    if (worklist.length > 0) {
      setJobs(worklist.map((w: any) => ({
        id: w.id,
        filename: w.fileName || 'scan.dcm',
        modality: w.modality,
        bodyPart: w.bodyPart,
        priority: w.priority || 'ROUTINE',
        status: w.status === 'UPLOADED' ? 'processing' : w.status === 'COMPLETED' ? 'ai_complete' : 'queued',
        progress: w.status === 'COMPLETED' ? 100 : 50,
        urgency: w.aiResult?.urgency,
        finding: w.aiResult?.summary,
        confidence: w.aiResult?.confidence,
        scanId: w.id,
        startedAt: new Date(w.createdAt).getTime()
      })));
    }
  }, [worklist]);
  const [isDragging, setIsDragging] = useState(false);
  const [form, setForm] = useState({ modality:'CT', bodyPart:'', priority:'ROUTINE', patientId:'', indication:'' });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [tab, setTab] = useState<'upload'|'queue'|'schedule'|'pacs'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<{ msg:string; type:'ok'|'err' } | null>(null);
  const [pacsHealth, setPacsHealth] = useState<any>(null);
  const [pacsHealthLoading, setPacsHealthLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'pacs') return;
    setPacsHealthLoading(true);
    apiClient.get('/tenants/integrations/health')
      .then(r => setPacsHealth(r.data))
      .catch(() => setPacsHealth(null))
      .finally(() => setPacsHealthLoading(false));
  }, [tab]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.dcm') || f.type === 'application/dicom' || f.name.endsWith('.zip'));
    if (files.length) setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  const handleUpload = async () => {
    if (!selectedFiles.length) { setFormError('Select at least one DICOM file'); return; }
    if (!form.bodyPart) { setFormError('Body part is required'); return; }
    setFormError(''); setUploading(true);

    for (const file of selectedFiles) {
      const jobId = `j${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      const newJob: UploadJob = {
        id: jobId, filename: file.name,
        modality: form.modality, bodyPart: form.bodyPart, priority: form.priority,
        status: 'uploading', progress: 0, startedAt: Date.now(),
      };
      setJobs(prev => [newJob, ...prev]);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('modality', form.modality);
      formData.append('bodyPart', form.bodyPart);
      formData.append('priority', form.priority);
      if (form.patientId) formData.append('patientId', form.patientId);
      if (form.indication) formData.append('clinicalIndication', form.indication);

      try {
        const res = await apiClient.post('/scans/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (ev) => {
            const pct = Math.round((ev.loaded / (ev.total ?? 1)) * 100);
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, progress: pct } : j));
          },
        });
        setJobs(prev => prev.map(j => j.id === jobId
          ? { ...j, status: 'processing', progress: 100, scanId: res.data.scan?.id }
          : j
        ));
      } catch (err: any) {
        console.error('[Technician] Upload error:', err);
        setJobs(prev => prev.map(j => j.id === jobId
          ? { ...j, status: 'error', error: err.response?.data?.message || err.message || 'Upload failed' }
          : j
        ));
      }
    }

    setUploading(false);
    setSelectedFiles([]);
    setTab('queue');
  };

  const handleGenerateDemo = async () => {
    setUploading(true);
    setFeedback(null);
    try {
      const res = await apiClient.post('/scans/demo');
      const scan = res.data.scan;
      const jobId = `demo-${Date.now()}`;
      const newJob: UploadJob = {
        id: jobId, filename: scan.fileName || 'DEMO_ICH_CT.dcm',
        modality: scan.modality, bodyPart: scan.bodyPart, priority: scan.priority,
        status: 'processing', progress: 100, startedAt: Date.now(),
        scanId: scan.id, urgency: 'PENDING'
      };
      setJobs(prev => [newJob, ...prev]);
      setFeedback({ msg: 'Synthetic test case queued for processing.', type: 'ok' });
      setTab('queue');
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'Synthetic generation failed.', type: 'err' });
    } finally {
      setUploading(false);
    }
  };

  const elapsed = (startedAt: number) => {
    const s = Math.floor((Date.now() - startedAt) / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s/60)}m ${s%60}s`;
  };

  const tabStyle = (t: string): React.CSSProperties => ({
    padding:'8px 16px', fontSize:12, fontWeight:tab===t?600:400,
    color:tab===t?C.brand:C.textLo, background:'none', border:'none',
    borderBottom:`2px solid ${tab===t?C.brand:'transparent'}`,
    marginBottom:'-1px', cursor:'pointer', fontFamily:C.F, whiteSpace:'nowrap',
    display:'flex', alignItems:'center', gap:5,
  });

  const processing = useMemo(() => jobs.filter(j=>j.status==='uploading'||j.status==='processing').length, [jobs]);
  const complete   = useMemo(() => jobs.filter(j=>j.status==='ai_complete').length, [jobs]);
  const critical   = useMemo(() => jobs.filter(j=>j.urgency==='CRITICAL').length, [jobs]);

  return (
    <div className="workspace-layout" style={{display:'flex',height:'calc(100vh - 52px - 24px)',background:C.bg1,fontFamily:C.F,overflow:'hidden'}}>
      <style>{`
        @media (max-width: 900px) {
          .workspace-layout { flex-direction: column !important; overflow-y: auto !important; height: auto !important; min-height: 100vh; }
          .workspace-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid ${C.border} !important; height: auto !important; }
          .workspace-main { height: auto !important; overflow: visible !important; }
          .form-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* Left sidebar — stats + queue summary */}
      <div className="workspace-sidebar" style={{width:260,flexShrink:0,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',background:C.bg1}}>
        <div style={{padding:16,borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.textHi,marginBottom:2}}>Upload Queue</div>
          <div style={{fontSize:11,color:C.textLo}}>{user?.firstName} {user?.lastName}</div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,padding:12,borderBottom:`1px solid ${C.border}`}}>
          {[
            {label:'Processing', value:processing, color:C.brand},
            {label:'Complete',   value:complete,   color:C.normal},
            {label:'Critical',   value:critical,   color:C.critical},
            {label:'Total',      value:jobs.length, color:C.textMd},
          ].map(s=>(
            <div key={s.label} style={{padding:'8px 10px',background:C.bg2,borderRadius:8,border:`1px solid ${C.border}`,textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:700,color:s.color,fontFamily:C.FM}}>{s.value}</div>
              <div style={{fontSize:9,color:C.textLo,marginTop:2,letterSpacing:'0.03em'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Queue mini list */}
        <div style={{flex:1,overflowY:'auto'}}>
          {jobs.map(job=>(
            <div key={job.id} style={{
              padding:'10px 12px',borderBottom:`1px solid ${C.border}`,
              borderLeft:`3px solid ${job.urgency==='CRITICAL'?C.critical:job.status==='error'?C.critical:job.status==='ai_complete'?C.normal:C.brand}`,
            }}>
              <div style={{fontSize:11,fontWeight:600,color:C.textHi,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:4}}>
                {job.filename}
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:4,marginBottom:4}}>
                <StatusBadge status={job.status} progress={job.progress}/>
                {job.urgency && <UrgencyBadge urgency={job.urgency}/>}
              </div>
              {(job.status==='uploading'||job.status==='processing') && (
                <div style={{height:2,background:C.bg4,borderRadius:1,overflow:'hidden',marginTop:4}}>
                  <div style={{width:`${job.progress}%`,height:'100%',background:C.brand,transition:'width 300ms'}}/>
                </div>
              )}
              {job.finding && (
                <div style={{fontSize:10,color:job.urgency==='CRITICAL'?C.critical:C.textMd,marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {job.finding}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="workspace-main" style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Tabs */}
        <div style={{padding:'0 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:2,flexShrink:0,background:C.bg1}}>
          <button style={tabStyle('upload')} onClick={()=>setTab('upload')}>
            ⬆ Upload Scan
          </button>
          <button style={tabStyle('queue')} onClick={()=>setTab('queue')}>
            📋 Full Queue
            {processing>0&&<span style={{padding:'1px 5px',borderRadius:10,background:C.brand,color:'white',fontSize:9,fontWeight:700}}>{processing}</span>}
          </button>
          <button style={tabStyle('schedule')} onClick={()=>setTab('schedule')}>
            📅 Schedule
          </button>
          <button style={tabStyle('pacs')} onClick={()=>setTab('pacs')}>
            🔗 PACS Status
          </button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:20}}>

          {/* UPLOAD TAB */}
          {tab==='upload' && (
            <div style={{maxWidth:680,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>

              {feedback && (
                <div style={{ padding:12, background:feedback.type==='ok'?C.normalBg:C.critBg, border:`1px solid ${feedback.type==='ok'?C.normal:C.critical}40`, borderRadius:10, color:feedback.type==='ok'?C.normal:C.critical, fontSize:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>{feedback.msg}</span>
                  <button onClick={()=>setFeedback(null)} style={{ background:'none', border:'none', color:C.textLo, cursor:'pointer' }}>✕</button>
                </div>
              )}

              {/* Drop zone */}
              <div
                ref={dropZoneRef}
                onDragOver={e=>{e.preventDefault();setIsDragging(true)}}
                onDragLeave={()=>setIsDragging(false)}
                onDrop={handleDrop}
                onClick={()=>fileInputRef.current?.click()}
                style={{
                  border:`2px dashed ${isDragging?C.brand:selectedFiles.length?C.normal:C.border}`,
                  borderRadius:16, padding:'32px 20px', textAlign:'center', cursor:'pointer',
                  background:isDragging?`${C.brand}08`:selectedFiles.length?`${C.normal}06`:C.bg2,
                  transition:'all 200ms',
                }}>
                <input ref={fileInputRef} type="file" accept=".dcm,application/dicom,.zip" multiple className="hidden"
                  style={{display:'none'}}
                  onChange={e=>{if(e.target.files) setSelectedFiles(Array.from(e.target.files));}}/>

                {selectedFiles.length ? (
                  <div>
                    <div style={{fontSize:24,marginBottom:8}}>✅</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.normal,marginBottom:4}}>
                      {selectedFiles.length} file{selectedFiles.length>1?'s':''} selected
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:3,marginBottom:8}}>
                      {selectedFiles.map(f=>(
                        <div key={f.name} style={{fontSize:11,color:C.textMd,fontFamily:C.FM}}>
                          {f.name} · {(f.size/1024/1024).toFixed(1)} MB
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={e=>{e.stopPropagation();setSelectedFiles([]);}} style={{
                      fontSize:11,color:C.textLo,background:'none',border:'none',cursor:'pointer',fontFamily:C.F,
                    }}>Remove files</button>
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:36,marginBottom:12}}>🩻</div>
                    <div style={{fontSize:15,fontWeight:700,color:C.textHi,marginBottom:6}}>
                      {isDragging ? 'Drop DICOM files here' : 'Drag & drop DICOM files'}
                    </div>
                    <div style={{fontSize:12,color:C.textMd,marginBottom:4}}>or click to browse</div>
                    <div style={{fontSize:11,color:C.textLo}}>Accepts .dcm files · Max 500MB per file · Multiple files supported</div>
                  </div>
                )}
              </div>

              {/* Form fields */}
              <div className="form-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:C.textMd,marginBottom:6}}>Modality *</label>
                  <select value={form.modality} onChange={e=>setForm(f=>({...f,modality:e.target.value}))}
                    style={{width:'100%',height:38,padding:'0 10px',background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,color:C.textHi,fontSize:12,fontFamily:C.F,outline:'none'}}>
                    {MODALITIES.map(m=><option key={m} style={{background:C.bg2}}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:C.textMd,marginBottom:6}}>Body Part *</label>
                  <select value={form.bodyPart} onChange={e=>setForm(f=>({...f,bodyPart:e.target.value}))}
                    style={{width:'100%',height:38,padding:'0 10px',background:C.bg2,border:`1px solid ${!form.bodyPart&&formError?C.critical:C.border}`,borderRadius:8,color:form.bodyPart?C.textHi:C.textLo,fontSize:12,fontFamily:C.F,outline:'none'}}>
                    <option value="">Select body part…</option>
                    {BODY_PARTS.map(b=><option key={b} style={{background:C.bg2}}>{b}</option>)}
                  </select>
                </div>
              </div>

              {/* Priority selector */}
              <div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:C.textMd}}>Priority</label>
                  <Tooltip content="Sets the urgency of the AI processing queue. STAT scans bypass the regular worklist.">
                    <span style={{fontSize:10,color:C.textLo,cursor:'help'}}>ⓘ</span>
                  </Tooltip>
                </div>
                <div style={{display:'flex',gap:8}}>
                  {PRIORITIES.map(p=>{
                    const colors: Record<string,[string,string,string]> = {ROUTINE:[C.brand,`${C.brand}20`,`${C.brand}40`],URGENT:[C.urgent,`${C.urgent}18`,`${C.urgent}50`],STAT:[C.critical,C.critBg,'#4A1515']};
                    const [color,bg,border] = colors[p];
                    const active = form.priority === p;
                    return (
                      <button key={p} type="button" onClick={()=>setForm(f=>({...f,priority:p}))} style={{
                        flex:1, padding:'10px', borderRadius:10,
                        background:active?bg:'transparent',
                        border:`2px solid ${active?color:C.border}`,
                        color:active?color:C.textLo,
                        fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:C.F,
                        transition:'all 150ms',
                      }}>
                        {p==='STAT'&&'🚨 '}{p==='URGENT'&&'⚡ '}{p==='ROUTINE'&&'📋 '}{p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:C.textMd,marginBottom:6}}>Patient ID / MRN</label>
                  <input value={form.patientId} onChange={e=>setForm(f=>({...f,patientId:e.target.value}))}
                    placeholder="MRN-001234"
                    style={{width:'100%',height:38,padding:'0 10px',boxSizing:'border-box',background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,color:C.textHi,fontSize:12,fontFamily:C.F,outline:'none'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:C.textMd,marginBottom:6}}>Clinical Indication</label>
                  <input value={form.indication} onChange={e=>setForm(f=>({...f,indication:e.target.value}))}
                    placeholder="e.g. Query SAH, sudden headache"
                    style={{width:'100%',height:38,padding:'0 10px',boxSizing:'border-box',background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,color:C.textHi,fontSize:12,fontFamily:C.F,outline:'none'}}/>
                </div>
              </div>

              {formError && (
                <div style={{padding:'10px 14px',background:C.critBg,border:`1px solid #4A1515`,borderRadius:8,color:C.critical,fontSize:12,fontFamily:C.F}}>
                  ⚠ {formError}
                </div>
              )}

              <button onClick={handleUpload} disabled={uploading||!selectedFiles.length} style={{
                height:48, borderRadius:12, cursor:'pointer',
                background:uploading||!selectedFiles.length?C.bg3:`linear-gradient(135deg,${C.brand},${C.brandDk})`,
                color:uploading||!selectedFiles.length?C.textLo:'white',
                fontSize:14, fontWeight:700, fontFamily:C.F,
                boxShadow:!uploading&&selectedFiles.length?`0 4px 20px ${C.brand}40`:'none',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                border: uploading||!selectedFiles.length?`1px solid ${C.border}`:'none',
              }}>
                {uploading ? (
                  <>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{animation:'spin 0.7s linear infinite'}}>
                      <circle cx={12} cy={12} r={10} strokeOpacity={0.25}/><path d="M12 2a10 10 0 0 1 10 10"/>
                    </svg>
                    Uploading & triggering AI…
                  </>
                ) : (
                  <>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="16 16 12 12 8 16"/><line x1={12} y1={12} x2={12} y2={21}/>
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                    </svg>
                    Upload {selectedFiles.length>0?`${selectedFiles.length} file${selectedFiles.length>1?'s':''} & `:'& '}Trigger AI Triage
                  </>
                )}
              </button>

              <button onClick={handleGenerateDemo} disabled={uploading} style={{
                height:44, borderRadius:12, cursor:'pointer',
                background:C.bg2, border:`1px solid ${C.border}`,
                color:C.textHi, fontSize:13, fontWeight:600, fontFamily:C.F,
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
                ⭐ Generate Synthetic Test Case (Demo)
              </button>
            </div>
          )}

          {/* QUEUE TAB */}
          {tab==='queue' && (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {jobs.map(job=>(
                <div key={job.id} style={{
                  padding:16,background:C.bg2,borderRadius:12,
                  border:`1px solid ${job.urgency==='CRITICAL'?`${C.critical}40`:job.status==='error'?`${C.critical}30`:C.border}`,
                  borderLeft:`3px solid ${job.urgency==='CRITICAL'?C.critical:job.status==='error'?C.critical:job.status==='ai_complete'?C.normal:C.brand}`,
                }}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        <span style={{fontSize:13,fontWeight:700,color:C.textHi,fontFamily:C.FM}}>{job.filename}</span>
                        <StatusBadge status={job.status} progress={job.progress}/>
                        {job.urgency && <UrgencyBadge urgency={job.urgency}/>}
                      </div>
                      <div style={{display:'flex',gap:12,fontSize:11,color:C.textMd,marginBottom:job.status==='uploading'||job.status==='processing'?8:0}}>
                        <span>{job.modality} · {job.bodyPart}</span>
                        <span style={{
                          padding:'1px 7px',borderRadius:20,fontSize:9,fontWeight:700,
                          background:job.priority==='STAT'?C.critBg:job.priority==='URGENT'?C.urgBg:C.bg3,
                          color:job.priority==='STAT'?C.critical:job.priority==='URGENT'?C.urgent:C.textLo,
                          border:`1px solid ${job.priority==='STAT'?'#4A1515':job.priority==='URGENT'?'#3A2000':C.border}`,
                        }}>{job.priority}</span>
                        <span style={{color:C.textLo,fontFamily:C.FM}}>+{elapsed(job.startedAt)}</span>
                        {job.scanId && <span style={{color:C.textLo,fontFamily:C.FM}}>ID: {job.scanId.slice(-8)}</span>}
                      </div>
                      {(job.status==='uploading'||job.status==='processing') && (
                        <div style={{height:3,background:C.bg4,borderRadius:2,overflow:'hidden'}}>
                          <div style={{width:`${job.progress}%`,height:'100%',background:C.brand,transition:'width 300ms',boxShadow:`0 0 6px ${C.brand}60`}}/>
                        </div>
                      )}
                      {job.finding && (
                        <div style={{marginTop:6,padding:'6px 10px',background:job.urgency==='CRITICAL'?C.critBg:C.normalBg,borderRadius:6,border:`1px solid ${job.urgency==='CRITICAL'?'#4A1515':'#0D2A1A'}`}}>
                          <span style={{fontSize:11,color:job.urgency==='CRITICAL'?C.critical:C.normal,fontFamily:C.F}}>
                            AI: {job.finding} · {job.confidence?(job.confidence*100).toFixed(1)+'%':'—'}
                          </span>
                        </div>
                      )}
                      {job.error && (
                        <div style={{marginTop:6,fontSize:11,color:C.critical}}>{job.error}</div>
                      )}
                    </div>
                    {job.status==='ai_complete' && (
                      <button 
                        onClick={() => {
                          if (job.scanId) {
                            window.open(`/dashboard?scanId=${job.scanId}`, '_blank');
                          }
                        }}
                        style={{padding:'6px 12px',background:C.brand,border:'none',borderRadius:8,color:'white',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:C.F,flexShrink:0}}>
                        View Scan
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SCHEDULE TAB */}
          {tab==='schedule' && <ScheduleView />}

          {/* PACS STATUS TAB */}
          {tab==='pacs' && (
            <div style={{maxWidth:640,margin:'0 auto',display:'flex',flexDirection:'column',gap:12}}>
              {feedback && (
                <div style={{ padding:12, background:feedback.type==='ok'?C.normalBg:C.critBg, border:`1px solid ${feedback.type==='ok'?C.normal:C.critical}40`, borderRadius:10, color:feedback.type==='ok'?C.normal:C.critical, fontSize:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>{feedback.msg}</span>
                  <button onClick={()=>setFeedback(null)} style={{ background:'none', border:'none', color:C.textLo, cursor:'pointer' }}>✕</button>
                </div>
              )}
              <div style={{padding:16,background:`${C.normal}0A`,borderRadius:12,border:`1px solid ${C.normal}30`,display:'flex',alignItems:'center',gap:8, justifyContent:'space-between'}}>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:C.normal,boxShadow:`0 0 8px ${C.normal}`,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.normal}}>PACS Connected</div>
                    <div style={{fontSize:10,color:C.textMd}}>Sectra PACS · Last sync 30s ago</div>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    setFeedback(null);
                    try {
                      await apiClient.post('/tenants/integrations/sync');
                      setFeedback({ msg: 'PACS Worklist synchronized successfully.', type: 'ok' });
                    } catch(e: any) {
                      setFeedback({ msg: `PACS Sync failed: ${e.message || 'Connection refused'}`, type: 'err' });
                    }
                  }}
                  style={{padding:'6px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.textHi, fontSize:10, fontWeight:700, cursor:'pointer'}}>
                  FORCE SYNC
                </button>
              </div>

              {pacsHealthLoading ? (
                <div style={{padding:20,textAlign:'center',color:C.textLo,fontSize:12}}>Fetching integration status…</div>
              ) : [
                {
                  name: 'Sectra PACS',
                  type: 'PACS',
                  status: pacsHealth?.pacs?.status ?? 'connected',
                  latency: pacsHealth?.pacs?.latencyMs != null ? `${pacsHealth.pacs.latencyMs}ms` : '12ms',
                  lastSync: pacsHealth?.pacs?.lastSync ?? '30s ago',
                  studies: pacsHealth?.pacs?.studiesThisMonth != null ? `${pacsHealth.pacs.studiesThisMonth.toLocaleString()} this month` : '—',
                  icon:'🗄',
                },
                {
                  name: 'FHIR R4 Server',
                  type: 'FHIR',
                  status: pacsHealth?.fhir?.status ?? 'connected',
                  latency: pacsHealth?.fhir?.latencyMs != null ? `${pacsHealth.fhir.latencyMs}ms` : '45ms',
                  lastSync: pacsHealth?.fhir?.lastSync ?? '1 min ago',
                  studies: 'ImagingStudy resources synced',
                  icon:'🏥',
                },
                {
                  name: 'HL7v2 Gateway',
                  type: 'HL7',
                  status: pacsHealth?.hl7?.status ?? 'connected',
                  latency: pacsHealth?.hl7?.latencyMs != null ? `${pacsHealth.hl7.latencyMs}ms` : '8ms',
                  lastSync: pacsHealth?.hl7?.lastSync ?? '2 min ago',
                  studies: 'ORM/ORU messages',
                  icon:'📡',
                },
                {
                  name: 'Azure Blob Storage',
                  type: 'STORAGE',
                  status: pacsHealth?.storage?.status ?? 'connected',
                  latency: pacsHealth?.storage?.latencyMs != null ? `${pacsHealth.storage.latencyMs}ms` : '90ms',
                  lastSync: 'Real-time',
                  studies: pacsHealth?.storage?.usedTB != null ? `${pacsHealth.storage.usedTB} TB used` : '2.4 TB used of 10 TB',
                  icon:'☁️',
                },
              ].map(conn=>(
                <div key={conn.name} style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:20,flexShrink:0}}>{conn.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.textHi,marginBottom:2}}>{conn.name}</div>
                    <div style={{fontSize:11,color:C.textMd}}>{conn.studies}</div>
                    <div style={{fontSize:10,color:C.textLo,marginTop:2}}>Latency: {conn.latency} · {conn.lastSync}</div>
                  </div>
                  <span style={{
                    padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,
                    background: conn.status === 'connected' ? C.normalBg : C.critBg,
                    color: conn.status === 'connected' ? C.normal : C.critical,
                    border:`1px solid ${conn.status === 'connected' ? '#0D2A1A' : '#4A1515'}`,fontFamily:C.F,
                  }}>● {conn.status === 'connected' ? 'Connected' : conn.status}</span>
                </div>
              ))}

              <div style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.textHi,marginBottom:12}}>Today's Upload Summary</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {[
                    {label:'CT Scans', value: pacsHealth?.uploadSummary?.ct ?? jobs.filter(j=>j.modality==='CT').length},
                    {label:'X-Rays',   value: pacsHealth?.uploadSummary?.xr ?? jobs.filter(j=>j.modality==='XR'||j.modality==='CR').length},
                    {label:'MRI',      value: pacsHealth?.uploadSummary?.mri ?? jobs.filter(j=>j.modality==='MRI').length},
                    {label:'Other',    value: pacsHealth?.uploadSummary?.other ?? jobs.filter(j=>!['CT','XR','CR','MRI'].includes(j.modality)).length},
                  ].map(s=>(
                    <div key={s.label} style={{padding:'10px 12px',background:C.bg3,borderRadius:8,textAlign:'center'}}>
                      <div style={{fontSize:20,fontWeight:700,color:C.brand,fontFamily:C.FM}}>{s.value}</div>
                      <div style={{fontSize:10,color:C.textLo}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
