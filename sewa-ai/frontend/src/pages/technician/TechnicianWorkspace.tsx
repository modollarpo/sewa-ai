// SEWA AI — TechnicianWorkspace.tsx
// DICOM upload (drag-drop), live worklist, PACS sync status, queue management
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTechnicianData, useAppointmentData } from '../../hooks/useDashboardData';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Tooltip } from '../../components/ui/Tooltip';

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

const MODALITIES = ['CT','MRI','XR','US','NM','PET','MG','CR'];
const BODY_PARTS = ['HEAD','CHEST','ABDOMEN','PELVIS','SPINE','NECK','EXTREMITY','WHOLE_BODY'];
const PRIORITIES = ['ROUTINE','URGENT','STAT'];

function StatusBadge({ status, progress }: { status: string; progress: number }) {
  const cfg: Record<string, string> = {
    queued: 'bg-[#1B3028] text-[#3A6055] border-[#1B3028]',
    uploading: 'bg-[#2A6EF2]/10 text-[#2A6EF2] border-[#2A6EF2]/20',
    processing: 'bg-[#408D7B]/10 text-[#408D7B] border-[#408D7B]/20',
    ai_complete: 'bg-[#1DBF73]/10 text-[#1DBF73] border-[#1DBF73]/20',
    error: 'bg-[#E03535]/10 text-[#E03535] border-[#E03535]/20',
  };
  const labels: Record<string, string> = {
    queued: 'Queued', uploading: `Uploading ${progress}%`, processing: 'AI Analysis',
    ai_complete: '✓ Processed', error: 'System Error',
  };
  const style = cfg[status] || cfg.queued;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border transition-all ${style}`}>
      { (status === 'uploading' || status === 'processing') ? (
        <span className="w-1.5 h-1.5 rounded-full border border-current border-t-transparent animate-spin" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {labels[status]}
    </span>
  );
}

function UrgencyPill({ u }: { u: string }) {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-[#E03535]/10 text-[#E03535] border-[#E03535]/30 shadow-[0_0_8px_rgba(224,53,53,0.1)]',
    URGENT: 'bg-[#E08A20]/10 text-[#E08A20] border-[#E08A20]/30',
    STAT: 'bg-[#E03535] text-white border-[#E03535] animate-pulse',
    ROUTINE: 'bg-[#1B3028] text-[#3A6055] border-[#1B3028]',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all ${styles[u] || styles.ROUTINE}`}>
      {u === 'STAT' && '🚨 '}{u}
    </span>
  );
}

function ScheduleView() {
  const { appointments, loading } = useAppointmentData();
  
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="p-4 bg-[#0C1D17] rounded-2xl border border-[#1B3028] flex justify-between items-center shadow-lg">
        <div>
          <h3 className="text-sm font-black text-[#D0ECE6]">Clinical Throughput</h3>
          <p className="text-[10px] text-[#3A6055] font-bold uppercase tracking-widest mt-0.5">Scanner Node 01 · Today's Schedule</p>
        </div>
        <span className="text-[10px] font-mono text-[#408D7B] font-bold">{new Date().toLocaleDateString('en-GB')}</span>
      </div>
      
      {loading ? (
        <div className="py-20 text-center text-[#3A6055] font-black uppercase tracking-widest text-xs">Accessing Schedule...</div>
      ) : appointments.length === 0 ? (
        <div className="py-20 text-center bg-[#08160F] rounded-2xl border border-[#1B3028] border-dashed">
          <span className="text-2xl mb-2 block">🗓️</span>
          <p className="text-[10px] text-[#3A6055] font-bold uppercase tracking-widest">No assigned procedures today</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {appointments.map((a: any) => (
            <div key={a.id} className="group p-4 bg-[#0C1D17]/50 hover:bg-[#0C1D17] border border-[#1B3028] rounded-2xl flex items-center gap-4 transition-all hover:border-[#408D7B]/30">
              <div className="w-16 text-center border-r border-[#1B3028] pr-4">
                <div className="text-xs font-black text-[#408D7B] font-mono">
                  {new Date(a.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-[#D0ECE6] group-hover:text-[#408D7B] transition-colors">{a.patient?.name || 'Unknown Patient'}</div>
                <div className="text-[10px] text-[#3A6055] font-bold uppercase tracking-widest mt-0.5">
                  {a.type.replace(/_/g, ' ')} <span className="mx-1 opacity-30">•</span> Ref: Dr. {a.doctor?.lastName || 'Anon'}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                a.status === 'completed' ? 'bg-[#1DBF73]/10 text-[#1DBF73] border-[#1DBF73]/20' : 'bg-[#1B3028] text-[#3A6055] border-[#1B3028]'
              }`}>
                {a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TechnicianWorkspace({ onNavigate }: { onNavigate?: (p:string)=>void }) {
  const { user } = useAuthStore();
  const { worklist, loading: listLoading } = useTechnicianData();
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [form, setForm] = useState({ modality:'CT', bodyPart:'', priority:'ROUTINE', patientId:'', indication:'' });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [tab, setTab] = useState<'upload'|'queue'|'schedule'|'pacs'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ msg:string; type:'ok'|'err' } | null>(null);
  const [pacsHealth, setPacsHealth] = useState<any>(null);
  const [pacsHealthLoading, setPacsHealthLoading] = useState(false);

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
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'processing', progress: 100, scanId: res.data.scan?.id } : j));
      } catch (err: any) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error', error: err.response?.data?.message || 'Upload failed' } : j));
      }
    }
    setUploading(false);
    setSelectedFiles([]);
    setTab('queue');
  };

  const handleGenerateDemo = async () => {
    setUploading(true); setFeedback(null);
    try {
      const res = await apiClient.post('/scans/demo');
      const scan = res.data.scan;
      const jobId = `demo-${Date.now()}`;
      setJobs(prev => [{
        id: jobId, filename: scan.fileName || 'DEMO_STUDY.dcm', modality: scan.modality, bodyPart: scan.bodyPart, priority: scan.priority,
        status: 'processing', progress: 100, startedAt: Date.now(), scanId: scan.id, urgency: 'PENDING'
      }, ...prev]);
      setFeedback({ msg: 'Synthetic diagnostic case added to queue.', type: 'ok' });
      setTab('queue');
    } catch (err: any) {
      setFeedback({ msg: 'Synthetic node generation failed.', type: 'err' });
    } finally { setUploading(false); }
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const processing = useMemo(() => jobs.filter(j=>j.status==='uploading'||j.status==='processing').length, [jobs]);
  const complete = useMemo(() => jobs.filter(j=>j.status==='ai_complete').length, [jobs]);
  const critical = useMemo(() => jobs.filter(j=>j.urgency==='CRITICAL').length, [jobs]);

  return (
    <div className="flex h-screen bg-[#05100D] overflow-hidden font-sans text-[#D0ECE6]">
      <style>{`
        @media (max-width: 1023px) {
          .sidebar-overlay { 
            display: block; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); z-index: 900; opacity: 0; pointer-events: none; transition: opacity 300ms;
          }
          .sidebar-overlay.open { opacity: 1; pointer-events: auto; }
          .sidebar {
            position: fixed !important; top: 0; bottom: 0; left: -320px;
            z-index: 1000 !important; width: 320px !important;
            transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .sidebar.open { transform: translateX(320px); }
          .main-content { padding: 20px !important; }
        }
      `}</style>

      <div className={`sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
      
      {/* Panel 1: Stats & Active Queue (Sidebar) */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''} w-80 flex flex-col bg-[#08160F] border-r border-[#1B3028] shadow-2xl z-10 transition-all duration-300`}>
        <div className="p-6 border-b border-[#1B3028] bg-[#0C1D17]/50 backdrop-blur-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-[#408D7B] uppercase tracking-widest">Technician Terminal</span>
            {isMobile && <button onClick={() => setMobileMenuOpen(false)} className="text-[#3A6055] hover:text-white">✕</button>}
          </div>
          <h2 className="text-lg font-black text-[#D0ECE6]">{user?.tenantName || 'SEWA Health'}</h2>
          
          <div className="grid grid-cols-2 gap-2 mt-6">
            {[
              { label: 'Active', val: processing, col: '#408D7B' },
              { label: 'STAT', val: critical, col: '#E03535' }
            ].map(s => (
              <div key={s.label} className="p-3 bg-[#0C1D17] border border-[#1B3028] rounded-xl text-center group transition-all hover:border-[#408D7B]/30">
                <div className="text-xl font-black font-mono leading-none mb-1" style={{ color: s.col }}>{s.val}</div>
                <div className="text-[9px] font-bold text-[#3A6055] uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 bg-[#05100D]/50 border-b border-[#1B3028] flex justify-between items-center">
            <span className="text-[9px] font-black text-[#3A6055] uppercase tracking-widest">Recent Node Activity</span>
            <span className="text-[9px] font-mono text-[#2E6B5E]">{jobs.length} TOTAL</span>
          </div>
          
          {jobs.map(job => (
            <div key={job.id} className={`p-4 border-b border-[#1B3028] transition-all hover:bg-[#111F1A] border-l-4 ${
              job.urgency === 'CRITICAL' ? 'border-l-[#E03535]' : job.status === 'ai_complete' ? 'border-l-[#1DBF73]' : 'border-l-transparent'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <div className="text-[11px] font-black text-[#D0ECE6] truncate w-32">{job.filename}</div>
                <StatusBadge status={job.status} progress={job.progress} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#3A6055] uppercase">{job.modality} · {job.bodyPart}</span>
                {job.urgency && <UrgencyPill u={job.urgency} />}
              </div>
              {job.finding && (
                <div className="mt-2 text-[10px] text-[#6FA898] italic line-clamp-1 border-t border-[#1B3028] pt-1">
                  AI: {job.finding}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col bg-[#05100D] relative min-w-0 main-content">
        
        {/* Workspace Navigation */}
        <header className="px-6 border-b border-[#1B3028] bg-[#08160F] flex items-center justify-between z-20 overflow-x-auto scrollbar-none">
          <div className="flex gap-1">
            {isMobile && (
              <button onClick={() => setMobileMenuOpen(true)} className="px-4 text-[#408D7B]">
                ☰
              </button>
            )}
            {[
              { id: 'upload', label: 'Ingest', icon: '⬆' },
              { id: 'queue', label: 'Worklist', icon: '📋' },
              { id: 'schedule', label: 'Procedures', icon: '📅' },
              { id: 'pacs', label: 'PACS', icon: '🔗' },
            ].map(t => (
              <button 
                key={t.id} 
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-2 px-4 lg:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${
                  tab === t.id ? 'border-[#408D7B] text-[#D0ECE6] bg-[#408D7B]/5' : 'border-transparent text-[#3A6055] hover:text-[#6FA898]'
                }`}
              >
                <span>{t.icon}</span> {!isMobile && t.label}
              </button>
            ))}
          </div>
          {!isMobile && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1DBF73] animate-pulse-dot" />
                <span className="text-[9px] font-mono text-[#408D7B] uppercase font-black">Node_Live</span>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {feedback && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-black uppercase tracking-widest animate-fade-in ${
                feedback.type === 'ok' ? 'bg-[#1DBF73]/10 border-[#1DBF73]/20 text-[#1DBF73]' : 'bg-[#E03535]/10 border-[#E03535]/20 text-[#E03535]'
              }`}>
                <span>{feedback.type === 'ok' ? '✓' : '⚠'} {feedback.msg}</span>
                <button onClick={() => setFeedback(null)}>✕</button>
              </div>
            )}

            {/* UPLOAD WORKFLOW */}
            {tab === 'upload' && (
              <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                
                {/* Drag-Drop Terminal */}
                <div 
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative p-12 rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center text-center gap-4 ${
                    isDragging ? 'bg-[#408D7B]/10 border-[#408D7B] scale-[0.99]' : selectedFiles.length ? 'bg-[#1DBF73]/5 border-[#1DBF73]/30' : 'bg-[#08160F] border-[#1B3028] hover:border-[#408D7B]/30'
                  }`}
                >
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => { if(e.target.files) setSelectedFiles(Array.from(e.target.files)); }} />
                  
                  {selectedFiles.length ? (
                    <div className="animate-fade-in space-y-4">
                      <div className="text-5xl text-[#1DBF73] drop-shadow-[0_0_15px_rgba(29,191,115,0.3)]">📦</div>
                      <div>
                        <div className="text-lg font-black text-[#D0ECE6] uppercase tracking-tighter">{selectedFiles.length} DICOM Objects Ready</div>
                        <p className="text-xs text-[#3A6055] font-bold uppercase tracking-widest mt-1">Payload: {(selectedFiles.reduce((a,b)=>a+b.size,0)/1024/1024).toFixed(1)} MB</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setSelectedFiles([]); }} className="text-[10px] font-black text-[#E03535] uppercase hover:underline">Flush Ingest Buffer</button>
                    </div>
                  ) : (
                    <>
                      <div className="text-5xl opacity-40 group-hover:scale-110 transition-transform duration-500">🩻</div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-[#D0ECE6] uppercase tracking-tighter">{isDragging ? 'Release to Ingest' : 'Drop DICOM Nodes'}</h3>
                        <p className="text-xs text-[#3A6055] font-bold uppercase tracking-widest">or click to browse local PACS</p>
                      </div>
                      <div className="mt-4 px-4 py-2 rounded-full bg-[#111F1A] border border-[#1B3028] text-[9px] font-mono text-[#408D7B] uppercase tracking-widest">
                        .DCM / .ZIP / .IMG_STACK
                      </div>
                    </>
                  )}
                </div>

                {/* Configuration Matrix */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Modality Protocol</label>
                    <select value={form.modality} onChange={e => setForm(f=>({...f, modality:e.target.value}))} className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] transition-all">
                      {MODALITIES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Anatomical Target</label>
                    <select value={form.bodyPart} onChange={e => setForm(f=>({...f, bodyPart:e.target.value}))} className={`w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] transition-all ${!form.bodyPart && formError ? 'border-[#E03535]' : ''}`}>
                      <option value="">Select Target...</option>
                      {BODY_PARTS.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Triage Priority</label>
                  <div className="grid grid-cols-3 gap-3">
                    {PRIORITIES.map(p => (
                      <button 
                        key={p} 
                        onClick={() => setForm(f=>({...f, priority:p}))}
                        className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          form.priority === p 
                            ? (p === 'STAT' ? 'bg-[#E03535] text-white border-[#E03535] shadow-lg' : 'bg-[#408D7B]/20 text-[#408D7B] border-[#408D7B]')
                            : 'bg-[#08160F] border-[#1B3028] text-[#3A6055] hover:bg-[#111F1A]'
                        }`}
                      >
                        {p === 'STAT' && '🚨 '}{p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Patient MRN</label>
                    <input value={form.patientId} onChange={e => setForm(f=>({...f, patientId:e.target.value}))} placeholder="LOCAL-EHR-XXXX" className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Clinical Indication</label>
                    <input value={form.indication} onChange={e => setForm(f=>({...f, indication:e.target.value}))} placeholder="e.g. Acute Trauma, Stroke Protocol" className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] transition-all" />
                  </div>
                </div>

                {formError && <div className="text-[10px] font-black text-[#E03535] uppercase tracking-widest text-center animate-shake">⚠ {formError}</div>}

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    onClick={handleUpload} 
                    disabled={uploading || !selectedFiles.length}
                    className="w-full py-5 rounded-[1.5rem] bg-[#408D7B] hover:bg-[#52B09A] disabled:opacity-30 disabled:grayscale transition-all text-white text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-[#408D7B]/20 active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {uploading ? (
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      'Initialize AI Ingestion Node'
                    )}
                  </button>
                  <button onClick={handleGenerateDemo} disabled={uploading} className="w-full py-4 rounded-[1.5rem] bg-[#111F1A] border border-[#1B3028] text-[#3A6055] hover:text-[#D0ECE6] transition-all text-[10px] font-black uppercase tracking-widest">
                    ⭐ Trigger Synthetic Validation Case
                  </button>
                </div>
              </div>
            )}

            {/* FULL QUEUE TAB */}
            {tab === 'queue' && (
              <div className="grid gap-4 animate-fade-in">
                {jobs.map(job => (
                  <div key={job.id} className="p-6 bg-[#0C1D17] border border-[#1B3028] rounded-3xl flex items-center gap-6 shadow-xl transition-all hover:border-[#408D7B]/30 group">
                    <div className="w-12 h-12 rounded-2xl bg-[#08160F] border border-[#1B3028] flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">🩻</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-sm font-bold text-[#D0ECE6] truncate">{job.filename}</h4>
                        <StatusBadge status={job.status} progress={job.progress} />
                        {job.urgency && <UrgencyPill u={job.urgency} />}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-[#3A6055] font-bold uppercase tracking-widest">
                        <span>{job.modality} · {job.bodyPart}</span>
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded bg-[#08160F] ${job.priority === 'STAT' ? 'text-[#E03535]' : 'text-[#408D7B]'}`}>{job.priority}</span>
                        <span>•</span>
                        <span className="font-mono text-[#2E6B5E]">+{Math.floor((Date.now() - job.startedAt)/1000)}s</span>
                      </div>
                      {(job.status === 'uploading' || job.status === 'processing') && (
                        <div className="mt-4 h-1 bg-[#111F1A] rounded-full overflow-hidden">
                          <div className="h-full bg-[#408D7B] transition-all duration-1000 shadow-[0_0_8px_rgba(64,141,123,0.5)]" style={{ width: `${job.progress}%` }} />
                        </div>
                      )}
                    </div>
                    {job.status === 'ai_complete' && (
                      <button 
                        onClick={() => job.scanId && window.open(`/dashboard?scanId=${job.scanId}`, '_blank')}
                        className="px-5 py-2.5 rounded-xl bg-[#408D7B]/10 text-[#408D7B] border border-[#408D7B]/20 text-[10px] font-black uppercase tracking-widest hover:bg-[#408D7B] hover:text-white transition-all active:scale-95"
                      >
                        Launch PACS
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* SCHEDULE TAB */}
            {tab === 'schedule' && <ScheduleView />}

            {/* PACS STATUS TAB */}
            {tab === 'pacs' && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="p-6 bg-[#1DBF73]/5 border border-[#1DBF73]/20 rounded-3xl flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-4">
                    <span className="w-3 h-3 rounded-full bg-[#1DBF73] animate-pulse shadow-[0_0_10px_#1DBF73]" />
                    <div>
                      <h4 className="text-sm font-bold text-[#1DBF73]">PACS Integrated Master Node</h4>
                      <p className="text-[10px] text-[#3A6055] font-bold uppercase tracking-widest">Sectra Enterprise PACS · High Availability Sync</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-xl bg-[#1DBF73]/10 text-[#1DBF73] border border-[#1DBF73]/20 text-[9px] font-black uppercase tracking-widest hover:bg-[#1DBF73]/20 transition-all">Mesh Sync</button>
                </div>

                <div className="grid gap-3">
                  {[
                    { name: 'Imaging Storage Node', type: 'BLOB', status: 'Online', lat: '42ms', icon: '☁️' },
                    { name: 'FHIR R4 Gateway', type: 'EHR', status: 'Online', lat: '12ms', icon: '🏥' },
                    { name: 'HL7v2 Message Broker', type: 'RIS', status: 'Online', lat: '5ms', icon: '📡' },
                  ].map(node => (
                    <div key={node.name} className="p-4 bg-[#0C1D17] border border-[#1B3028] rounded-2xl flex items-center gap-4 transition-all hover:bg-[#111F1A]">
                      <div className="w-10 h-10 rounded-xl bg-[#08160F] flex items-center justify-center text-xl">{node.icon}</div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-[#D0ECE6]">{node.name}</div>
                        <div className="text-[9px] text-[#3A6055] font-bold uppercase tracking-widest mt-0.5">{node.type} Protocol <span className="mx-1">•</span> Latency: {node.lat}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#1DBF73]/10 text-[#1DBF73] text-[8px] font-black uppercase tracking-widest border border-[#1DBF73]/20">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Footer Terminal Stats */}
        <footer className="h-10 bg-[#050F0C] border-t border-[#1B3028] px-6 flex items-center justify-between text-[9px] font-mono text-[#2E5048] font-bold">
          <div className="flex gap-6 uppercase tracking-widest">
            <span className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#408D7B]" /> Dicom_Mesh: Stable</span>
            <span className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#1DBF73]" /> AI_Inference_Latency: 0.4s</span>
            <span className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#1DBF73]" /> Storage_Node_04: OK</span>
          </div>
          <div className="flex gap-4">
            <span>SEWA_OS v4.1.2</span>
            <span className="text-[#3A6055]">PROD_ENVIRONMENT</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
