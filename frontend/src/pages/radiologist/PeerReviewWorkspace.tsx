import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { Activity, Microscope, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ConfidenceIndicator, UncertaintyIndicator, StatusBanner } from '../../design-system/components';

import { dashboardColors as C } from '../../design-system/tokens';

export function PeerReviewWorkspace() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeScan, setActiveScan] = useState<any | null>(null);
  const [groundTruth, setGroundTruth] = useState('');
  const [status, setStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/learning-loop/queue');
      setQueue(res.data?.queue || []);
      if (res.data?.queue?.length > 0 && !activeScan) {
        setActiveScan(res.data.queue[0]);
      }
    } catch (e) {
      setStatus({ msg: 'Failed to load review queue.', type: 'err' });
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (target: 'AI' | 'RADIOLOGIST_1' | 'CUSTOM') => {
    if (!activeScan) return;
    
    let finalGT = '';
    if (target === 'AI') finalGT = activeScan.aiResult?.reportText || 'AI Finding confirmed';
    if (target === 'RADIOLOGIST_1') finalGT = activeScan.feedback?.correctedText || activeScan.report?.reportText || 'Radiologist 1 confirmed';
    if (target === 'CUSTOM') finalGT = groundTruth;

    try {
      await apiClient.post(`/learning-loop/review/${activeScan.id}`, {
        finalGroundTruth: finalGT,
        agreementTarget: target
      });
      
      // Remove from queue
      setQueue(q => q.filter(s => s.id !== activeScan.id));
      setActiveScan(null);
      setGroundTruth('');
    } catch (e) {
      setStatus({ msg: 'Failed to submit peer review.', type: 'err' });
    }
  };

  if (loading) {
    return (
      <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:C.textLo, fontFamily:C.F}}>
        Loading Peer Review Queue...
      </div>
    );
  }

  return (
    <div style={{flex:1, display:'flex', background:C.bg1, overflow:'hidden', fontFamily:C.F}}>
      
      <StatusBanner status={status} onClose={() => setStatus(null)} fixed />
      
      {/* Sidebar Queue */}
      <div style={{width: 350, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', background:C.bg2}}>
        <div style={{padding:'24px', borderBottom:`1px solid ${C.border}`}}>
          <h1 style={{fontSize:20, fontWeight:600, color:C.textHi, margin:0, display:'flex', alignItems:'center', gap:12}}>
            <Microscope size={20} color={C.brand} />
            Peer Review Queue
          </h1>
          <p style={{fontSize:12, color:C.textMd, margin:'4px 0 0'}}>Continuous Learning Loop Adjudication</p>
        </div>
        
        <div style={{flex:1, overflowY:'auto', padding:'16px'}}>
          {queue.length === 0 ? (
            <div style={{textAlign:'center', padding:32, color:C.textLo, fontSize:13}}>Queue is empty</div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              {queue.map(scan => (
                <div 
                  key={scan.id} 
                  onClick={() => setActiveScan(scan)}
                  style={{
                    padding:16, borderRadius:8, cursor:'pointer',
                    background: activeScan?.id === scan.id ? C.bg3 : 'transparent',
                    border: `1px solid ${activeScan?.id === scan.id ? C.brand : C.border}`
                  }}
                >
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                    <span style={{color:C.textHi, fontSize:14, fontWeight:600}}>{scan.patient?.mrn || 'Unknown MRN'}</span>
                    <span style={{color:C.textLo, fontSize:11, fontFamily:C.FM}}>{new Date(scan.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                    <span style={{fontSize:11, padding:'2px 8px', borderRadius:12, background:C.bg1, color:C.textMd}}>{scan.modality}</span>
                    {scan.requiresHumanReview && (
                      <span style={{fontSize:10, padding:'2px 8px', borderRadius:12, background:'#E08A2020', color:C.urgent, display:'flex', alignItems:'center', gap:4}}>
                        <AlertTriangle size={10} /> AI Uncertain
                      </span>
                    )}
                    {scan.feedback && (
                      <span style={{fontSize:10, padding:'2px 8px', borderRadius:12, background:'#2A6EF220', color:C.info, display:'flex', alignItems:'center', gap:4}}>
                        <Activity size={10} /> ACI Override
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Review Area */}
      <div style={{flex:1, display:'flex', flexDirection:'column', overflowY:'auto'}}>
        {!activeScan ? (
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:C.textLo}}>
            Select a case from the queue to review
          </div>
        ) : (
          <div style={{padding:40, maxWidth:1200, margin:'0 auto', width:'100%'}}>
            
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32}}>
              <div>
                <h2 style={{fontSize:24, color:C.textHi, margin:0}}>Scan Adjudication: {activeScan.id}</h2>
                <p style={{color:C.textMd, fontSize:14, marginTop:8}}>
                  Patient: {activeScan.patient?.sex} • {new Date().getFullYear() - new Date(activeScan.patient?.dateOfBirth).getFullYear()} y/o
                </p>
              </div>
            </div>

            <div style={{display:'flex', gap:32, marginBottom:40}}>
              {/* AI Original */}
              <div style={{flex:1, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}`, padding:24, display:'flex', flexDirection:'column'}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, color:C.textLo, fontSize:11, textTransform:'uppercase', letterSpacing:1}}>
                    <Activity size={16} /> Original AI Triage
                  </div>
                  {activeScan.aiResult?.confidence && (
                    <ConfidenceIndicator value={activeScan.aiResult.confidence} size="sm" />
                  )}
                </div>
                {activeScan.aiResult?.confidence && (
                  <div style={{marginBottom:12}}>
                    <UncertaintyIndicator value={activeScan.aiResult.confidence} showLabel={true} />
                  </div>
                )}
                <div style={{color:C.textHi, fontSize:14, lineHeight:1.6, flex:1, whiteSpace:'pre-wrap'}}>
                  {activeScan.aiResult?.reportText || activeScan.aiResult?.primaryFinding || 'No structured AI text available'}
                </div>
                <button 
                  onClick={() => submitReview('AI')}
                  style={{marginTop:24, padding:'12px', background:C.bg3, border:`1px solid ${C.border}`, color:C.textHi, borderRadius:8, cursor:'pointer', fontWeight:600}}
                >
                  Confirm AI Finding (Reject Edit)
                </button>
              </div>

              {/* Radiologist Edit */}
              <div style={{flex:1, background:C.bg2, borderRadius:12, border:`1px solid ${C.brandLt}40`, padding:24, display:'flex', flexDirection:'column'}}>
                <div style={{display:'flex', alignItems:'center', gap:8, color:C.brandLt, fontSize:11, textTransform:'uppercase', letterSpacing:1, marginBottom:16}}>
                  <ShieldCheck size={16} /> Primary Radiologist Edit
                </div>
                <div style={{color:C.textHi, fontSize:14, lineHeight:1.6, flex:1, whiteSpace:'pre-wrap'}}>
                  {activeScan.feedback?.correctedText || activeScan.report?.reportText || 'No radiologist text available'}
                </div>
                <button 
                  onClick={() => submitReview('RADIOLOGIST_1')}
                  style={{marginTop:24, padding:'12px', background:C.brand, border:'none', color:C.bg1, borderRadius:8, cursor:'pointer', fontWeight:600}}
                >
                  Confirm Radiologist (Update AI)
                </button>
              </div>
            </div>

            {/* Custom Adjudication */}
            <div style={{background:C.bg2, borderRadius:12, border:`1px solid ${C.border}`, padding:24}}>
              <div style={{fontSize:14, fontWeight:600, color:C.textHi, marginBottom:16}}>Or Submit Custom Ground Truth</div>
              <textarea 
                value={groundTruth}
                onChange={e => setGroundTruth(e.target.value)}
                placeholder="Enter definitive ground truth for this case to retrain the model..."
                style={{width:'100%', height:120, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:8, padding:16, color:C.textHi, fontSize:14, fontFamily:C.F, resize:'none', boxSizing:'border-box'}}
              />
              <div style={{display:'flex', justifyContent:'flex-end', marginTop:16}}>
                <button 
                  onClick={() => submitReview('CUSTOM')}
                  disabled={!groundTruth.trim()}
                  style={{padding:'10px 24px', background:C.info, color:'#FFF', border:'none', borderRadius:8, fontWeight:600, cursor:groundTruth.trim() ? 'pointer' : 'not-allowed', opacity:groundTruth.trim() ? 1 : 0.5}}
                >
                  Submit Ground Truth
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
